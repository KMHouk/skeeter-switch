targetScope = 'resourceGroup'

@description('Key Vault resource ID')
param keyVaultId string

@description('Storage Account resource ID')
param storageAccountId string

@description('Managed Identity principal ID')
param identityPrincipalId string

// Extract resource names from IDs
var keyVaultName = last(split(keyVaultId, '/'))
var storageAccountName = last(split(storageAccountId, '/'))

// Reference existing resources to scope role assignments
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' existing = {
  name: storageAccountName
}

// RBAC: Key Vault Secrets User role for Managed Identity
resource keyVaultSecretsUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVaultId, identityPrincipalId, 'KeyVaultSecretsUser')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: identityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// RBAC: Storage Table Data Contributor role for Managed Identity
resource storageTableDataContributorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccountId, identityPrincipalId, 'StorageTableDataContributor')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3')
    principalId: identityPrincipalId
    principalType: 'ServicePrincipal'
  }
}
