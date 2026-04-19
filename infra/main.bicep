targetScope = 'resourceGroup'

@description('Environment name (dev or prod)')
@allowed(['dev', 'prod'])
param environment string

@description('Location for all resources')
param location string = resourceGroup().location

@description('Application name prefix')
param appName string = 'skeeter-switch'

@description('Default latitude for mosquito trap location')
param locationLat string = '40.7128'

@description('Default longitude for mosquito trap location')
param locationLon string = '-74.0060'

@description('Enable dry run mode (true for dev, false for prod)')
param dryRun bool = environment == 'dev'

@description('Kasa EP40 device alias as set in the TP-Link Kasa app')
param kasaDeviceAlias string = 'skeeter-switch'

var prefix = '${appName}-${environment}'
var uniqueSuffix = uniqueString(resourceGroup().id, appName, environment, location)

// Module: Managed Identity
module identity 'modules/identity.bicep' = {
  name: 'identity-deployment'
  params: {
    prefix: prefix
    location: location
  }
}

// Module: Storage Account
module storage 'modules/storage.bicep' = {
  name: 'storage-deployment'
  params: {
    prefix: prefix
    location: location
    uniqueSuffix: uniqueSuffix
  }
}

// Module: Log Analytics Workspace
module logAnalytics 'modules/loganalytics.bicep' = {
  name: 'loganalytics-deployment'
  params: {
    prefix: prefix
    location: location
  }
}

// Module: Application Insights
module appInsights 'modules/appinsights.bicep' = {
  name: 'appinsights-deployment'
  params: {
    prefix: prefix
    location: location
    workspaceId: logAnalytics.outputs.workspaceId
  }
}

// Module: Key Vault
module keyVault 'modules/keyvault.bicep' = {
  name: 'keyvault-deployment'
  params: {
    prefix: prefix
    location: location
    uniqueSuffix: uniqueSuffix
  }
}

// Module: Function App
module functionApp 'modules/functionapp.bicep' = {
  name: 'functionapp-deployment'
  params: {
    prefix: prefix
    location: location
    uniqueSuffix: uniqueSuffix
    identityId: identity.outputs.identityId
    identityClientId: identity.outputs.clientId
    storageConnectionString: storage.outputs.storageConnectionString
    appInsightsConnectionString: appInsights.outputs.connectionString
    keyVaultUri: keyVault.outputs.keyVaultUri
    kasaDeviceAlias: kasaDeviceAlias
    dryRun: dryRun
    locationLat: locationLat
    locationLon: locationLon
  }
}

// Module: Static Web App
module staticWebApp 'modules/staticwebapp.bicep' = {
  name: 'staticwebapp-deployment'
  params: {
    prefix: prefix
    location: location
    functionAppId: functionApp.outputs.functionAppId
    functionAppRegion: location
  }
}

// Module: Alerts
module alerts 'modules/alerts.bicep' = {
  name: 'alerts-deployment'
  params: {
    appInsightsId: appInsights.outputs.appInsightsId
    functionAppName: functionApp.outputs.functionAppName
    location: location
  }
}

// Module: RBAC Assignments (subscription scope)
module rbac 'modules/rbac.bicep' = {
  name: 'rbac-deployment'
  scope: subscription()
  params: {
    keyVaultId: keyVault.outputs.keyVaultId
    storageAccountId: storage.outputs.storageAccountId
    identityPrincipalId: functionApp.outputs.identityPrincipalId
  }
}

// Outputs
output functionAppName string = functionApp.outputs.functionAppName
output functionAppHostName string = functionApp.outputs.functionAppHostName
output staticWebAppName string = staticWebApp.outputs.staticWebAppName
output staticWebAppDefaultHostname string = staticWebApp.outputs.defaultHostname
output keyVaultName string = keyVault.outputs.keyVaultName
output keyVaultUri string = keyVault.outputs.keyVaultUri
output storageAccountName string = storage.outputs.storageAccountName
output appInsightsName string = appInsights.outputs.appInsightsName
output logAnalyticsWorkspaceName string = logAnalytics.outputs.workspaceName
output managedIdentityClientId string = identity.outputs.clientId
