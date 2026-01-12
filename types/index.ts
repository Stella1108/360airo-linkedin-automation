// types/index.ts
export interface LinkedInAccountNew {
  id: number
  name: string
  headline: string | null
  is_active: boolean
  has_li_at: boolean
  profile_image_url: string | null
  profile_url: string | null
  last_synced: string | null
  daily_limit: number
  installation_id: string
  dashboard_user_id: string
}

export interface LinkedInSession {
  id: number
  account_id: number
  li_at_cookie: string
  has_li_at: boolean
  is_active: boolean
  created_at: string
  installation_id: string
  browser_agent?: string
}

export interface ProfileToConnect {
  id: string
  name: string
  linkedin_profile_url: string
  headline?: string
}