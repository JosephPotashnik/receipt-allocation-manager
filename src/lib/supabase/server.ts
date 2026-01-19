import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client for server-side operations
 * Uses the anon key for public operations
 */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Verify JWT token from Authorization header and return user info
 * Returns null if token is invalid
 */
export async function verifyJWT(request: Request): Promise<{
  user: { id: string; email: string } | null;
  error: string | null;
}> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return { user: null, error: error?.message || 'Invalid token' };
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email || '',
      },
      error: null,
    };
  } catch (err) {
    return {
      user: null,
      error: err instanceof Error ? err.message : 'Token verification failed',
    };
  }
}
