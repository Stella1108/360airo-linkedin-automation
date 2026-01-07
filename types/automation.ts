// types/automation.ts
export interface ConnectionSample {
  id: number
  linkedin_profile_url: string
  user_name: string
  status: 'pending' | 'sent' | 'accepted' | 'failed'
  account_id: number | null
  sent_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface AutomationJob {
  id: number
  account_id: number
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped'
  total_connections: number
  successful_connections: number
  failed_connections: number
  interval_minutes: number
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}
export interface AutomationTask {
  id: number
  installation_id: string
  dashboard_user_id: string | null
  account_id: number
  profile_id: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  li_at_cookie: string
  profile_url: string
  connection_note: string | null
  scheduled_time: string
  error: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface AutomationLog {
  id: number
  installation_id: string | null
  account_id: number | null
  queue_id: number | null
  action: string
  status: 'success' | 'failed' | 'warning'
  message: string
  details: any
  created_at: string
}

export interface DailyLimit {
  id: number
  installation_id: string
  account_id: number
  date: string
  sent_count: number
  max_limit: number
  created_at: string
  updated_at: string
}

export interface ConnectionProfile {
  id: number
  installation_id: string
  dashboard_user_id: string | null
  name: string
  company: string | null
  location: string | null
  profile_url: string
  connection_note: string | null
  status: 'pending' | 'connected' | 'failed'
  created_at: string
  updated_at: string
}