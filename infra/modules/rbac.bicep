targetScope = 'subscription'

@description('Key Vault resource ID')
param keyVaultId string

@description('Storage Account resource ID')
param storageAccountId string

@description('Managed Identity principal ID')
param identityPrincipalId string

// RBAC: Key Vault Secrets User role for Managed Identity
resource keyVaultSecretsUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVaultId, identityPrincipalId, 'KeyVaultSecretsUser')
  properties: {
    scope: keyVaultId
    roleDefinitionId: '/subscriptions/${subscription().subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/4633458b-17de-408a-b874-0445c86b69e6'
    principalId: identityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// RBAC: Storage Table Data Contributor role for Managed Identity
resource storageTableDataContributorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccountId, identityPrincipalId, 'StorageTableDataContributor')
  properties: {
    scope: storageAccountId
    roleDefinitionId: '/subscriptions/${subscription().subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3'
    principalId: identityPrincipalId
    principalType: 'ServicePrincipal'
  }
}
