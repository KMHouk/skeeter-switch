@description('Resource name prefix')
param prefix string

@description('Location for all resources (note: Static Web Apps have limited regions)')
param location string

resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: '${prefix}-swa'
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    buildProperties: {
      skipGithubActionWorkflowGeneration: true
    }
  }
}

output staticWebAppName string = staticWebApp.name
output staticWebAppId string = staticWebApp.id
output defaultHostname string = staticWebApp.properties.defaultHostname
