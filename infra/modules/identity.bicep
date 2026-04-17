@description('Resource name prefix')
param prefix string

@description('Location for all resources')
param location string

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${prefix}-identity'
  location: location
}

output identityId string = identity.id
output principalId string = identity.properties.principalId
output clientId string = identity.properties.clientId
