import { createClient } from './client';

const supabase = createClient();

/**
 * Sign up a new user with email and password
 */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { user: null, session: null, error: error.message };
  }

  return {
    user: data.user,
    session: data.session,
    error: null,
  };
}

/**
 * Sign in an existing user with email and password
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { user: null, session: null, error: error.message };
  }

  return {
    user: data.user,
    session: data.session,
    error: null,
  };
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error: error?.message || null };
}

/**
 * Get the current session
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return { session: null, error: error.message };
  }

  return { session: data.session, error: null };
}

/**
 * Get the current user from session
 */
export async function getUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { user: null, error: error?.message || 'No user found' };
  }

  return { user: data.user, error: null };
}

/**
 * Refresh the session and get a new JWT token
 */
export async function refreshSession() {
  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    return { session: null, error: error.message };
  }

  return { session: data.session, error: null };
}

/**
 * Get the JWT access token from the current session
 */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: unknown) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}
