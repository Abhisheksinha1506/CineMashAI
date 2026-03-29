import { createClient } from '@supabase/supabase-js'

// Client-side Supabase client with anonymous key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase client environment variables')
  throw new Error('Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any) {
  console.error('Supabase error:', error)
  throw new Error(`Database operation failed: ${error?.message || 'Unknown error'}`)
}

// Database table names (matching our schema)
export const TABLES = {
  MOVIES: 'movies',
  FUSIONS: 'fusions', 
  FUSION_VOTES: 'fusion_votes',
  TOKEN_USAGE: 'token_usage'
} as const
