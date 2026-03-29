import { createClient } from '@supabase/supabase-js'

// Lazy-initialized Supabase client to avoid build-time errors
let supabaseServerInstance: ReturnType<typeof createClient> | null = null

export function getSupabaseServer() {
  if (supabaseServerInstance) {
    return supabaseServerInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase server environment variables')
    throw new Error('Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  }

  supabaseServerInstance = createClient(supabaseUrl, supabaseServiceKey)
  return supabaseServerInstance
}

// Legacy export - now lazily initialized when accessed
export const supabaseServer = new Proxy({}, {
  get(target, prop) {
    const client = getSupabaseServer()
    return client[prop as keyof typeof client]
  },
  has(target, prop) {
    const client = getSupabaseServer()
    return prop in client
  },
  ownKeys() {
    const client = getSupabaseServer()
    return Object.getOwnPropertyNames(client)
  }
}) as any

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
