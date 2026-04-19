@description('Resource name prefix')
param prefix string

@description('Location for all resources')
param location string

@description('Unique suffix for globally unique names')
param uniqueSuffix string

@description('Managed Identity resource ID')
param identityId string

@description('Managed Identity client ID')
param identityClientId string

@description('Storage connection string')
param storageConnectionString string

@description('Application Insights connection string')
param appInsightsConnectionString string

@description('Key Vault URI')
param keyVaultUri string

@description('IFTTT event name for ON')
param iftttEventOn string

@description('IFTTT event name for OFF')
param iftttEventOff string

@description('Enable dry run mode')
param dryRun bool

@description('Location latitude')
param locationLat string

@description('Location longitude')
param locationLon string

var functionAppName = '${prefix}-func-${uniqueSuffix}'
var appServicePlanName = '${prefix}-plan'

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource functionApp 'Microsoft.Web/sites@2023-01-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identityId}': {}
    }
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    keyVaultReferenceIdentity: identityId
    siteConfig: {
      linuxFxVersion: 'Node|20'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: storageConnectionString
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
        {
          name: 'KEY_VAULT_URI'
          value: keyVaultUri
        }
        {
          name: 'TABLE_STORAGE_CONNECTION_STRING'
          value: storageConnectionString
        }
        {
          name: 'AZURE_MAPS_SUBSCRIPTION_KEY'
          value: '@Microsoft.KeyVault(SecretUri=${keyVaultUri}secrets/azure-maps-subscription-key/)'
        }
        {
          name: 'IFTTT_KEY'
          value: '@Microsoft.KeyVault(SecretUri=${keyVaultUri}secrets/ifttt-key/)'
        }
        {
          name: 'IFTTT_EVENT_ON'
          value: iftttEventOn
        }
        {
          name: 'IFTTT_EVENT_OFF'
          value: iftttEventOff
        }
        {
          name: 'DRY_RUN'
          value: string(dryRun)
        }
        {
          name: 'LOCATION_LAT'
          value: locationLat
        }
        {
          name: 'LOCATION_LON'
          value: locationLon
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false'
        }
        {
          name: 'AZURE_CLIENT_ID'
          value: identityClientId
        }
      ]
      cors: {
        allowedOrigins: [
          'https://portal.azure.com'
        ]
      }
    }
  }
}

output functionAppName string = functionApp.name
output functionAppId string = functionApp.id
output functionAppHostName string = functionApp.properties.defaultHostName
output identityPrincipalId string = reference(identityId, '2023-01-31').principalId
