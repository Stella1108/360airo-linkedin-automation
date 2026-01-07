// lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Use hardcoded values from your .env.local
const supabaseUrl = 'https://tlojcedldomndodmnjan.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsb2pjZWRsZG9tbmRvZG1uamFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMzcyMDYsImV4cCI6MjA2NzgxMzIwNn0.rM-5ap5sYqV9reVU6oVPY8Dn9xQCr5u3cW8RbWoo1W0'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsb2pjZWRsZG9tbmRvZG1uamFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjIzNzIwNiwiZXhwIjoyMDY3ODEzMjA2fQ.mANJl647engnunFBvmHX85My-WzLcKsLB11T-3JpMGM'

// Client for frontend (uses anon key)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Admin client for backend (uses service role key)
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: true
  }
})

console.log('✅ Supabase initialized successfully')