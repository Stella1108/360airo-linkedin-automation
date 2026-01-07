// app/automation/types.ts
import { Node } from 'reactflow'

// Define specific literal types for better type safety
export type ScheduleType = 'daily' | 'weekly' | 'monthly' | 'cron'
export type DelayUnit = 'seconds' | 'minutes' | 'hours' | 'days'
export type FilterField = 'company' | 'title' | 'location' | 'industry' | 'connections'
export type FilterOperator = 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan'
export type DelayType = 'fixed' | 'random' | 'exponential'
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface WorkflowNodeData {
  label: string
  type: string
  config?: {
    // LinkedIn Account
    accountId?: string
    name?: string
    cookies?: string
    proxy?: string
    isActive?: boolean
    dailyLimit?: number
    
    // Connection Request
    message?: string
    limitPerDay?: number
    delayBetween?: number
    customNote?: string
    targetAudience?: string
    maxConnections?: number
    
    // Schedule
    scheduleType?: ScheduleType
    time?: string
    daysOfWeek?: number[]
    cronExpression?: string
    timezone?: string
    
    // Delay
    duration?: number
    unit?: DelayUnit
    delayType?: DelayType
    maxDuration?: number
    maxUnit?: DelayUnit
    
    // Filter
    field?: FilterField
    operator?: FilterOperator
    value?: string
    caseSensitive?: boolean
    
    // Webhook
    url?: string
    method?: HttpMethod
    headers?: Record<string, string>
    retryCount?: number
    
    // General
    [key: string]: any
  }
  status?: 'pending' | 'running' | 'completed' | 'failed'
  lastRun?: string
  error?: string
}

// Export the WorkflowNode type
export type WorkflowNode = Node<WorkflowNodeData>

export interface WorkflowExecution {
  id: string
  workflow_name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  started_at: string
  completed_at?: string
  results?: {
    success_count: number
    failure_count: number
    total_attempts: number
  }
  config: any
  error?: string
}

export interface ConnectionLog {
  id: string
  execution_id: string
  node_id: string
  status: 'success' | 'failed'
  message?: string
  error?: string
  data?: any
  created_at: string
}

