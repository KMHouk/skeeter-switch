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

export async function getTpLinkCredentials(): Promise<{ username: string; password: string }> {
  const username = process.env.TPLINK_USERNAME ?? await getSecret('tplink-username');
  const password = process.env.TPLINK_PASSWORD ?? await getSecret('tplink-password');
  return { username, password };
}

export async function getAzureMapsKey(): Promise<string> {
  if (process.env.AZURE_MAPS_SUBSCRIPTION_KEY) {
    return process.env.AZURE_MAPS_SUBSCRIPTION_KEY;
  }
  return getSecret('AZURE_MAPS_SUBSCRIPTION_KEY');
}
