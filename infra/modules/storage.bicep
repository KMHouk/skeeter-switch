@description('Resource name prefix')
param prefix string

@description('Location for all resources')
param location string

@description('Unique suffix for globally unique names')
param uniqueSuffix string

var storageAccountName = '${replace(prefix, '-', '')}${uniqueSuffix}'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

resource tableService 'Microsoft.Storage/storageAccounts/tableServices@2023-01-01' = {
  name: 'default'
  parent: storageAccount
}

resource switchStateTable 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-01-01' = {
  name: 'SwitchState'
  parent: tableService
}

resource overridesTable 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-01-01' = {
  name: 'Overrides'
  parent: tableService
}

resource configTable 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-01-01' = {
  name: 'Config'
  parent: tableService
}

resource eventLogTable 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-01-01' = {
  name: 'EventLog'
  parent: tableService
}

output storageAccountName string = storageAccount.name
output storageAccountId string = storageAccount.id
@secure()
output storageConnectionString string = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${listKeys(storageAccount.id, storageAccount.apiVersion).keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
