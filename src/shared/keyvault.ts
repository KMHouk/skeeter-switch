import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

const secretCache = new Map<string, string>();
let client: SecretClient | null = null;

function getClient(): SecretClient {
  const vaultUri = process.env.KEY_VAULT_URI;
  if (!vaultUri) {
    throw new Error('KEY_VAULT_URI is not set');
  }
  if (!client) {
    client = new SecretClient(vaultUri, new DefaultAzureCredential());
  }
  return client;
}

export async function getSecret(name: string): Promise<string> {
  const cached = secretCache.get(name);
  if (cached) {
    return cached;
  }
  const result = await getClient().getSecret(name);
  if (!result.value) {
    throw new Error(`Secret ${name} returned no value`);
  }
  secretCache.set(name, result.value);
  return result.value;
}

export async function getIftttKey(): Promise<string> {
  if (process.env.IFTTT_KEY) {
    return process.env.IFTTT_KEY;
  }
  return getSecret('IFTTT_KEY');
}

export async function getAzureMapsKey(): Promise<string> {
  if (process.env.AZURE_MAPS_SUBSCRIPTION_KEY) {
    return process.env.AZURE_MAPS_SUBSCRIPTION_KEY;
  }
  return getSecret('AZURE_MAPS_SUBSCRIPTION_KEY');
}
