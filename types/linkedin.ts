// types/linkedin.ts
export interface LinkedInAccount {
  id: string
  user_id: string
  name: string
  email?: string
  headline?: string
  company?: string
  location?: string
  profile_image_url?: string
  profile_url?: string
  status: 'connected' | 'disconnected' | 'error' | 'syncing'
  cookie_count: number
  has_li_at: boolean
  last_synced?: string
  created_at: string
  updated_at: string
  is_active: boolean
  cookies?: any[] // Array of cookie objects
  automation_runs?: any[] // Array of automation runs
}