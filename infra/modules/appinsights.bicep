@description('Resource name prefix')
param prefix string

@description('Location for all resources')
param location string

@description('Log Analytics Workspace ID')
param workspaceId string

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${prefix}-appinsights'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspaceId
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

output appInsightsId string = appInsights.id
output connectionString string = appInsights.properties.ConnectionString
output instrumentationKey string = appInsights.properties.InstrumentationKey
output appInsightsName string = appInsights.name
