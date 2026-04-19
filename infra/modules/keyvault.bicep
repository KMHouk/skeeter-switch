@description('Resource name prefix')
param prefix string

@description('Location for all resources')
param location string

@description('Unique suffix for globally unique names')
param uniqueSuffix string

var keyVaultName = take('${replace(prefix, '-', '')}${uniqueSuffix}', 24)

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enablePurgeProtection: true
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

// Create placeholder secrets (user will need to update values)
resource iftttKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'ifttt-key'
  parent: keyVault
  properties: {
    value: 'PLACEHOLDER-UPDATE-AFTER-DEPLOYMENT'
  }
}

resource azureMapsKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'azure-maps-subscription-key'
  parent: keyVault
  properties: {
    value: 'PLACEHOLDER-UPDATE-AFTER-DEPLOYMENT'
  }
}

output keyVaultUri string = keyVault.properties.vaultUri
output keyVaultName string = keyVault.name
output keyVaultId string = keyVault.id
