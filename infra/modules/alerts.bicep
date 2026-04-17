@description('Application Insights resource ID')
param appInsightsId string

@description('Function App name for alert targeting')
param functionAppName string

@description('Location for all resources')
param location string

@description('Optional action group resource ID for alert notifications')
param actionGroupId string = ''

// Alert 1: Error count > 0 in 15 minutes
resource errorCountAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${functionAppName}-errors'
  location: 'global'
  properties: {
    description: 'Alert when exception count exceeds 0 in 15 minutes'
    severity: 2
    enabled: true
    scopes: [
      appInsightsId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'ExceptionCount'
          metricName: 'exceptions/count'
          operator: 'GreaterThan'
          threshold: 0
          timeAggregation: 'Count'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: actionGroupId != '' ? [
      {
        actionGroupId: actionGroupId
      }
    ] : []
  }
}

// Alert 2: Webhook failures (log query alert)
resource webhookFailuresAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = {
  name: '${functionAppName}-webhook-failures'
  location: location
  properties: {
    displayName: '${functionAppName} Webhook Failures'
    description: 'Alert when webhook failures are detected in traces'
    severity: 1
    enabled: true
    evaluationFrequency: 'PT15M'
    windowSize: 'PT30M'
    scopes: [
      appInsightsId
    ]
    criteria: {
      allOf: [
        {
          query: 'traces | where message contains "webhook" and message contains "failure"'
          timeAggregation: 'Count'
          operator: 'GreaterThanOrEqual'
          threshold: 2
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: actionGroupId != '' ? {
      actionGroups: [
        actionGroupId
      ]
    } : {}
  }
}

// Alert 3: Heartbeat missing (no evaluation_cycle events in 15 minutes)
resource heartbeatMissingAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = {
  name: '${functionAppName}-heartbeat-missing'
  location: location
  properties: {
    displayName: '${functionAppName} Heartbeat Missing'
    description: 'Alert when no evaluation_cycle events detected in 15 minutes'
    severity: 1
    enabled: true
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    scopes: [
      appInsightsId
    ]
    criteria: {
      allOf: [
        {
          query: 'traces | where message contains "evaluation_cycle"'
          timeAggregation: 'Count'
          operator: 'LessThan'
          threshold: 1
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: actionGroupId != '' ? {
      actionGroups: [
        actionGroupId
      ]
    } : {}
  }
}

output errorCountAlertId string = errorCountAlert.id
output webhookFailuresAlertId string = webhookFailuresAlert.id
output heartbeatMissingAlertId string = heartbeatMissingAlert.id
