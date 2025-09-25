import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your .env.local file.');
}

// For server-side usage
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

// For client-side usage
export const clientSupabase = createClient(supabaseUrl!, supabaseAnonKey!);