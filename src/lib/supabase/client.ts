import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client for browser-side operations
 * The JWT token is managed manually via auth state
 */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
