// Set AZURE_ALLOWED_ORIGINS env var in production to match SWA hostname
const allowedOrigin = process.env.AZURE_ALLOWED_ORIGINS || 'http://localhost:4280';

export function getCorsHeaders(methods: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };
}
