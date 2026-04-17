import { HttpRequest, HttpResponseInit } from '@azure/functions';

export interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

export function getClientPrincipal(req: HttpRequest): ClientPrincipal | null {
  const header = req.headers.get('x-ms-client-principal');
  if (!header) return null;
  try {
    const decoded = Buffer.from(header, 'base64').toString('utf8');
    return JSON.parse(decoded) as ClientPrincipal;
  } catch {
    return null;
  }
}

export function isAuthError(
  result: ClientPrincipal | HttpResponseInit
): result is HttpResponseInit {
  return !('userRoles' in result);
}

export function requireAuth(
  req: HttpRequest,
  corsHeaders: Record<string, string>
): ClientPrincipal | HttpResponseInit {
  const principal = getClientPrincipal(req);
  if (!principal) {
    return {
      status: 401,
      jsonBody: { error: 'Unauthorized' },
      headers: corsHeaders,
    };
  }
  return principal;
}

export function requireAdmin(
  req: HttpRequest,
  corsHeaders: Record<string, string>
): ClientPrincipal | HttpResponseInit {
  const result = requireAuth(req, corsHeaders);
  if (isAuthError(result)) return result;
  if (!result.userRoles.includes('admin')) {
    return {
      status: 403,
      jsonBody: { error: 'Forbidden' },
      headers: corsHeaders,
    };
  }
  return result;
}
