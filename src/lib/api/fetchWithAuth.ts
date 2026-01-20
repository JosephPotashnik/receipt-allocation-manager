import { getAccessToken, refreshSession } from '@/lib/supabase/auth';

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

/**
 * Custom error class for session expiration
 * Components can check for this error type to redirect to login
 */
export class SessionExpiredError extends Error {
  constructor(message = 'Session expired. Please log in again.') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

/**
 * Fetch wrapper that automatically adds JWT authentication
 * and handles token refresh on 401 responses
 */
export async function fetchWithAuth(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  // Get current access token
  let token = await getAccessToken();

  if (!token) {
    throw new SessionExpiredError('No authentication token available. Please log in.');
  }

  // Make the initial request with the token
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  // If we get a 401, try to refresh the token and retry once
  if (response.status === 401) {
    const { session, error } = await refreshSession();

    if (error || !session) {
      // Refresh failed - user needs to re-login
      throw new SessionExpiredError();
    }

    // Retry with the new token
    token = session.access_token;
    response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  return response;
}

/**
 * POST request with authentication
 */
export async function postWithAuth<T>(
  url: string,
  body: T
): Promise<Response> {
  return fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
