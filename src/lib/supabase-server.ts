import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables:', {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? 'SET' : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? 'SET' : 'MISSING'
  })
  throw new Error('Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey)

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
