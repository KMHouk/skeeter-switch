@description('Resource name prefix')
param prefix string

@description('Location for all resources')
param location string

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${prefix}-workspace'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

output workspaceId string = workspace.id
output workspaceName string = workspace.name
