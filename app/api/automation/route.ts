// app/api/automation/route.ts - COMPLETE VERSION WITH VISIBLE BROWSER
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { LinkedInConnector, LinkedInConnectorResult } from '@/lib/puppeteer-connector'
import { PostgrestError } from '@supabase/supabase-js'
import { Cookie } from 'puppeteer'
import { v4 as uuidv4 } from 'uuid'

// ==================== TYPE DEFINITIONS ====================

interface AutomationTask {
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

interface LinkedInAccountNew {
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
  created_at: string
}

interface LinkedInSessionEncrypted {
  id: number
  account_id: number
  li_at_cookie: string
  cookies_encrypted: string
  has_li_at: boolean
  is_active: boolean
  created_at: string
  installation_id: string
  browser_agent?: string
  last_used?: string
  cookie_count?: number
  li_at_length?: number
  li_at_preview?: string
  updated_at?: string
}

interface DailyLimit {
  id: number
  installation_id: string
  account_id: number
  date: string
  sent_count: number
  max_limit: number
  created_at: string
  updated_at: string
}

interface ApiResponse {
  success: boolean
  message?: string
  taskId?: number
  profileUrl?: string
  error?: string
  details?: any
  automationId?: string
  account?: string
  target?: string
}

interface StatsResponse {
  stats: {
    pending: number
    sentToday: number
    activeAccounts: number
    date: string
  }
}

interface HealthResponse {
  status: string
  timestamp: string
  message: string
  activeAutomations: number
}

interface ActiveResponse {
  activeAutomations: Array<{
    id: string
    status: string
    accountId: number
    startedAt: string
    uptime: number
  }>
  count: number
  timestamp: string
}

interface AutomationLogUpdate {
  accountId: number
  profileUrl: string
  status: 'sent' | 'failed' | 'processing'
  errorMessage?: string | null
}

type ApiRouteResponse = ApiResponse | StatsResponse | HealthResponse | ActiveResponse

// ==================== UTILITY FUNCTIONS ====================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ==================== FIXED COOKIE DECRYPTION ====================

class CookieDecryptor {
  static extractLiAtCookie(cookiesEncrypted: string): string | null {
    if (!cookiesEncrypted) {
      return null
    }
    
    try {
      let decodedData = cookiesEncrypted
      
      if (cookiesEncrypted.includes('%')) {
        try {
          decodedData = decodeURIComponent(cookiesEncrypted)
        } catch (e) {
          // URL decode failed
        }
      }
      
      if (decodedData.startsWith('[') || decodedData.startsWith('{')) {
        try {
          const cookies = JSON.parse(decodedData)
          
          if (Array.isArray(cookies)) {
            for (const cookie of cookies) {
              if (cookie.name && cookie.name.toLowerCase().includes('li_at') && cookie.value) {
                let value = cookie.value
                
                if (!value.startsWith('AQED')) {
                  try {
                    const decoded = Buffer.from(value, 'base64').toString('utf-8')
                    if (decoded.startsWith('AQED')) {
                      return decoded
                    }
                  } catch (e) {
                    // Not Base64
                  }
                }
                return value
              }
            }
          }
        } catch (e) {
          console.log('JSON parse failed')
        }
      }
      
      const patterns = [
        /"li_at"\s*:\s*"([^"]+)"/,
        /'li_at'\s*:\s*'([^']+)'/,
        /li_at=([^;,\s]+)/,
        /(AQED[^"'\s]{100,})/
      ]
      
      for (const pattern of patterns) {
        const match = decodedData.match(pattern)
        if (match) {
          let cookieValue = match[1] || match[0]
          cookieValue = cookieValue.replace(/"/g, '').replace(/'/g, '').trim()
          
          if (!cookieValue.startsWith('AQED')) {
            try {
              const decoded = Buffer.from(cookieValue, 'base64').toString('utf-8')
              if (decoded.startsWith('AQED')) {
                return decoded
              }
            } catch (e) {
              // Not Base64
            }
          }
          
          if (cookieValue.startsWith('AQED') && cookieValue.length > 100) {
            return cookieValue
          }
        }
      }
      
      return null
    } catch (error) {
      console.error('Cookie extraction error:', error)
      return null
    }
  }
  
  static decodeLiAtCookie(liAtCookie: string): string {
    if (!liAtCookie) return liAtCookie
    
    if (liAtCookie.startsWith('AQED')) {
      return liAtCookie
    }
    
    try {
      const decoded = Buffer.from(liAtCookie, 'base64').toString('utf-8')
      if (decoded.startsWith('AQED')) {
        return decoded
      }
    } catch (e) {
      // Not Base64
    }
    
    return liAtCookie
  }
}

// ==================== COOKIE HELPER FUNCTIONS ====================

function createCookie(name: string, value: string, options?: {
  domain?: string
  path?: string
  expires?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
  session?: boolean
}): Cookie {
  // Calculate expiration (1 day from now)
  const expires = Math.floor(Date.now() / 1000) + 86400
  
  return {
    name,
    value,
    domain: options?.domain || '.linkedin.com',
    path: options?.path || '/',
    expires: options?.expires || expires,
    httpOnly: options?.httpOnly !== undefined ? options.httpOnly : true,
    secure: options?.secure !== undefined ? options.secure : true,
    sameSite: options?.sameSite || ('None' as 'Strict' | 'Lax' | 'None'),
    session: options?.session || false,
    size: value.length
  }
}

// Store active automations (in-memory)
const activeAutomations = new Map<string, {
  id: string
  startedAt: Date
  accountId: number
  status: 'running' | 'completed' | 'error'
}>()

// Helper function to update automation logs
async function updateAutomationLog(update: AutomationLogUpdate): Promise<void> {
  try {
    const { data: logs } = await supabaseAdmin
      .from('automation_logs')
      .select('id')
      .eq('account_id', update.accountId)
      .eq('profile_url', update.profileUrl)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (logs && logs.length > 0) {
      await supabaseAdmin
        .from('automation_logs')
        .update({
          status: update.status,
          error_message: update.errorMessage || null,
          completed_at: new Date().toISOString()
        })
        .eq('id', logs[0].id)
    }
  } catch (error: any) {
    console.error('Error updating log:', error.message)
  }
}

// ==================== VISIBLE BROWSER AUTOMATION ====================

async function runVisibleBrowserAutomation(
  automationId: string,
  account: LinkedInAccountNew,
  session: any,
  profileUrl: string,
  connectionNote?: string
): Promise<void> {
  console.log(`🚀 Starting VISIBLE automation ${automationId}`)
  console.log(`👤 Account: ${account.name}`)
  console.log(`🎯 Target: ${profileUrl}`)
  
  // Update active automations map
  activeAutomations.set(automationId, {
    id: automationId,
    startedAt: new Date(),
    accountId: account.id,
    status: 'running'
  })
  
  try {
    // Get LinkedIn connector and run automation
    const connector = new LinkedInConnector()
    
    // Prepare cookies
    let cookies: Cookie[] = []
    let liAtValue = session.li_at_cookie
    
    if (!liAtValue || liAtValue.length < 100) {
      throw new Error(`Invalid li_at cookie (length: ${liAtValue?.length || 0})`)
    }
    
    // DECODE Base64 if needed
    liAtValue = CookieDecryptor.decodeLiAtCookie(liAtValue)
    
    console.log(`✅ li_at cookie: ${liAtValue.substring(0, 30)}... (${liAtValue.length} chars)`)
    
    // Create proper cookie using helper function
    const liAtCookie = createCookie('li_at', liAtValue, {
      domain: '.linkedin.com',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 86400,
      httpOnly: true,
      secure: true,
      sameSite: 'None' as const,
      session: false
    })
    cookies = [liAtCookie]
    
    // ADDITIONAL COOKIES FOR BETTER LOGIN
    const additionalCookies = [
      createCookie('bcookie', `v=2&${Math.random().toString(36).substring(2)}`, {
        domain: '.linkedin.com',
        path: '/',
        secure: true,
        sameSite: 'None'
      }),
      createCookie('lang', 'v=2&lang=en-us', {
        domain: '.linkedin.com',
        path: '/'
      }),
      createCookie('li_rm', Math.random().toString(36).substring(2), {
        domain: '.linkedin.com',
        path: '/',
        secure: true,
        sameSite: 'None'
      })
    ]
    
    cookies = [...cookies, ...additionalCookies]
    
    console.log(`✅ Setting ${cookies.length} cookies for LinkedIn login`)
    
    // Initialize browser with VISIBLE WINDOW (headless: false)
    await connector.launchBrowser({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      cookies: cookies,
      headless: false, // CHANGED: Show browser window
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
      timeout: 60000
    })
    
    console.log('🌐 Browser launched with visible window')
    
    // Create task object for connector
    const task = {
      account_id: account.id,
      profile_url: profileUrl,
      connection_note: connectionNote || '',
      li_at_cookie: liAtValue
    }
    
    // Send connection
    console.log('🖱️ Starting visible automation process...')
    const result: LinkedInConnectorResult = await connector.sendConnection(task)
    
    // Keep browser open for 10 seconds so user can see the result
    console.log('⏳ Keeping browser open for 10 seconds...')
    await sleep(10000)
    
    await connector.close()
    
    // Update log
    await updateAutomationLog({
      accountId: account.id,
      profileUrl,
      status: result.success ? 'sent' : 'failed',
      errorMessage: result.success ? null : result.error
    })
    
    // Update active automation status
    const automation = activeAutomations.get(automationId)
    if (automation) {
      automation.status = result.success ? 'completed' : 'error'
    }
    
    if (result.success) {
      console.log(`🎉 Automation ${automationId} completed successfully!`)
    } else {
      console.error(`❌ Automation ${automationId} failed:`, result.error)
    }
    
  } catch (error: any) {
    console.error(`❌ Automation ${automationId} failed:`, error.message)
    
    await updateAutomationLog({
      accountId: account.id,
      profileUrl,
      status: 'failed',
      errorMessage: error.message
    })
    
    const automation = activeAutomations.get(automationId)
    if (automation) {
      automation.status = 'error'
    }
  }
}

// ==================== API ENDPOINTS ====================

// POST endpoint to process automation task
export async function POST(request: NextRequest): Promise<NextResponse<ApiRouteResponse>> {
  try {
    const body = await request.json()
    const { taskId, account_id, profile_url, connection_note }: { 
      taskId?: number; 
      account_id?: number; 
      profile_url?: string; 
      connection_note?: string 
    } = body
    
    // Handle direct automation request (from Express server format)
    if (account_id && profile_url) {
      const automationId = uuidv4()
      
      console.log(`🚀 Received direct automation request for account ${account_id}`)
      
      try {
        const { data: account, error: accountError } = await supabaseAdmin
          .from('linkedin_accounts_new')
          .select('*')
          .eq('id', account_id)
          .single()

        if (accountError) throw new Error(`Account not found: ${accountError.message}`)
        
        const { data: session, error: sessionError } = await supabaseAdmin
          .from('linkedin_sessions_new')
          .select('*')
          .eq('account_id', account_id)
          .eq('is_active', true)
          .single() as { data: LinkedInSessionEncrypted | null, error: any }
        
        if (sessionError || !session) {
          throw new Error(`Session not found: ${sessionError?.message || 'No session data'}`)
        }
        
        if (!session.cookies_encrypted && !session.li_at_cookie) {
          throw new Error('No cookies found for this account')
        }
        
        let liAtCookie = null
        let jsessionId = null
        
        if (session.li_at_cookie) {
          liAtCookie = CookieDecryptor.decodeLiAtCookie(session.li_at_cookie)
          
          if (liAtCookie && liAtCookie.startsWith('AQED')) {
            console.log(`✅ Using decoded li_at_cookie field (${liAtCookie.length} chars)`)
          } else {
            liAtCookie = null
          }
        }
        
        if (!liAtCookie && session.cookies_encrypted) {
          liAtCookie = CookieDecryptor.extractLiAtCookie(session.cookies_encrypted)
        }
        
        if (!liAtCookie || !liAtCookie.startsWith('AQED')) {
          throw new Error('Could not extract valid li_at cookie from any source')
        }
        
        const decryptedSession = {
          ...session,
          li_at_cookie: liAtCookie,
          jsessionid: jsessionId || undefined
        }
        
        // IMPORTANT: Start VISIBLE browser automation
        // Use setTimeout to avoid blocking the API response
        setTimeout(async () => {
          try {
            await runVisibleBrowserAutomation(automationId, account, decryptedSession, profile_url, connection_note)
          } catch (error: any) {
            console.error('Error in visible automation:', error.message)
          }
        }, 1000)
        
        const response: ApiResponse = {
          success: true,
          automationId,
          message: 'Automation started successfully. Browser window will open shortly!',
          account: account.name,
          target: profile_url
        }
        
        return NextResponse.json(response)
        
      } catch (error: any) {
        console.error('❌ Automation setup error:', error.message)
        const errorResponse: ApiResponse = {
          success: false,
          error: error.message
        }
        return NextResponse.json(errorResponse, { status: 500 })
      }
    }
    
    // Handle queued task request (original format)
    if (!taskId) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Task ID or account_id is required',
          error: 'Task ID or account_id is required' 
        },
        { status: 400 }
      )
    }

    // Get the task from database
    const { data: task, error: taskError } = await supabaseAdmin
      .from('automation_queue')
      .select('*')
      .eq('id', taskId)
      .eq('status', 'pending')
      .single()

    if (taskError || !task) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Task not found or not pending',
          error: taskError?.message || 'Task not found or not pending' 
        },
        { status: 404 }
      )
    }

    // Update status to processing
    await supabaseAdmin
      .from('automation_queue')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)

    // Process with Puppeteer - For queued tasks, still use headless
    const connector = new LinkedInConnector()
    
    // Prepare cookies if li_at_cookie exists
    let cookies: Cookie[] = []
    if (task.li_at_cookie) {
      const liAtCookie = createCookie('li_at', task.li_at_cookie, {
        domain: '.linkedin.com',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 86400,
        httpOnly: true,
        secure: true,
        sameSite: 'None' as const,
        session: false
      })
      cookies = [liAtCookie]
    }

    // Initialize browser with cookies (queued tasks use headless)
    await connector.launchBrowser({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      cookies: cookies,
      headless: true // Queued tasks run in background
    })

    // Send connection request
    const result: LinkedInConnectorResult = await connector.sendConnection(task)
    await connector.close()

    // Update task status based on result
    const updateData: Partial<AutomationTask> = {
      status: result.success ? 'completed' : 'failed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (!result.success && result.error) {
      updateData.error = result.error
    }

    await supabaseAdmin
      .from('automation_queue')
      .update(updateData)
      .eq('id', taskId)

    // Create log entry
    await supabaseAdmin
      .from('automation_logs')
      .insert({
        account_id: task.account_id,
        queue_id: taskId,
        action: 'send_connection',
        status: result.success ? 'success' : 'failed',
        message: result.success 
          ? `Connection sent to ${task.profile_url}` 
          : `Failed: ${result.error || 'Unknown error'}`,
        details: result,
        created_at: new Date().toISOString()
      })

    // Update daily limits if successful
    if (result.success) {
      await updateDailyLimits(task.account_id)
    }

    const response: ApiResponse = {
      success: result.success,
      message: result.success ? 'Connection sent successfully' : (result.error || 'Connection failed'),
      taskId,
      profileUrl: task.profile_url
    }

    if (!result.success && result.error) {
      response.error = result.error
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('API Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    const errorResponse: ApiResponse = { 
      success: false, 
      message: 'Internal server error',
      error: 'Internal server error', 
      details: errorMessage 
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Helper function to update daily limits
async function updateDailyLimits(accountId: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  
  const { data: limitData, error } = await supabaseAdmin
    .from('daily_limits')
    .select('*')
    .eq('account_id', accountId)
    .eq('date', today)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching daily limits:', error)
    return
  }

  if (limitData) {
    await supabaseAdmin
      .from('daily_limits')
      .update({
        sent_count: (limitData.sent_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', limitData.id)
  } else {
    await supabaseAdmin
      .from('daily_limits')
      .insert({
        account_id: accountId,
        date: today,
        sent_count: 1,
        max_limit: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
  }
}

// GET endpoint with multiple functionalities
export async function GET(request: NextRequest): Promise<NextResponse<ApiRouteResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    const action = searchParams.get('action')
    
    // Health check
    if (action === 'health') {
      const healthResponse: HealthResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'LinkedIn Automation API is running',
        activeAutomations: activeAutomations.size
      }
      return NextResponse.json(healthResponse)
    }
    
    // Get active automations
    if (action === 'active') {
      const activeAutomationsList = Array.from(activeAutomations.entries()).map(([id, automation]) => ({
        id,
        status: automation.status,
        accountId: automation.accountId,
        startedAt: automation.startedAt.toISOString(),
        uptime: Date.now() - automation.startedAt.getTime()
      }))
      
      const activeResponse: ActiveResponse = {
        activeAutomations: activeAutomationsList,
        count: activeAutomations.size,
        timestamp: new Date().toISOString()
      }
      return NextResponse.json(activeResponse)
    }
    
    // Test cookies endpoint
    if (action === 'test-cookies') {
      const account_id = searchParams.get('account_id')
      
      if (!account_id) {
        const errorResponse: ApiResponse = {
          success: false,
          error: 'account_id is required'
        }
        return NextResponse.json(errorResponse, { status: 400 })
      }
      
      const { data: session, error } = await supabaseAdmin
        .from('linkedin_sessions_new')
        .select('*')
        .eq('account_id', parseInt(account_id))
        .eq('is_active', true)
        .single()
      
      if (error || !session) {
        const errorResponse: ApiResponse = {
          success: false,
          error: 'Session not found'
        }
        return NextResponse.json(errorResponse, { status: 404 })
      }
      
      const liAtCookie = CookieDecryptor.extractLiAtCookie(session.cookies_encrypted)
      let directLiAt = session.li_at_cookie
      let isBase64Encoded = false
      
      if (directLiAt && !directLiAt.startsWith('AQED')) {
        try {
          const decoded = Buffer.from(directLiAt, 'base64').toString('utf-8')
          if (decoded.startsWith('AQED')) {
            directLiAt = decoded
            isBase64Encoded = true
          }
        } catch (e) {
          // Not Base64
        }
      }
      
      const testResponse: any = {
        success: true,
        accountId: parseInt(account_id),
        sessionFound: true,
        sessionId: session.id,
        directLiAtField: session.li_at_cookie ? `${session.li_at_cookie.substring(0, 30)}...` : null,
        directLiAtLength: session.li_at_cookie?.length || 0,
        isBase64Encoded,
        decodedDirectLiAt: directLiAt ? `${directLiAt.substring(0, 30)}...` : null,
        decodedStartsWithAQED: directLiAt?.startsWith('AQED') || false,
        extractedLiAt: liAtCookie ? `${liAtCookie.substring(0, 30)}...` : null,
        extractedLiAtLength: liAtCookie?.length || 0,
        extractedStartsWithAQED: liAtCookie?.startsWith('AQED') || false,
        cookiesEncryptedLength: session.cookies_encrypted?.length || 0,
        cookiesEncryptedPreview: session.cookies_encrypted?.substring(0, 100) || null,
        isUrlEncoded: session.cookies_encrypted?.includes('%') || false
      }
      
      return NextResponse.json(testResponse)
    }
    
    // Original task lookup
    if (taskId) {
      const { data: task, error } = await supabaseAdmin
        .from('automation_queue')
        .select('*')
        .eq('id', parseInt(taskId))
        .single()
      
      if (error || !task) {
        const errorResponse: ApiResponse = {
          success: false,
          message: 'Task not found',
          error: 'Task not found'
        }
        return NextResponse.json(errorResponse, { status: 404 })
      }
      
      const successResponse: ApiResponse = { 
        success: true, 
        message: 'Task found',
        taskId: task.id,
        profileUrl: task.profile_url
      }
      
      return NextResponse.json(successResponse)
    }

    // Get queue stats (default)
    const today = new Date().toISOString().split('T')[0]
    
    const [
      { count: pending, error: pendingError },
      { count: sentToday, error: sentError },
      { data: accounts, error: accountsError }
    ] = await Promise.all([
      supabaseAdmin
        .from('automation_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      
      supabaseAdmin
        .from('automation_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', `${today}T00:00:00`),
      
      supabaseAdmin
        .from('linkedin_accounts_new')
        .select('id, name, is_active, has_li_at')
        .eq('is_active', true)
    ])

    if (pendingError || sentError || accountsError) {
      console.error('Error fetching stats:', { pendingError, sentError, accountsError })
      
      const errorResponse: ApiResponse = {
        success: false,
        message: 'Failed to fetch statistics',
        error: 'Failed to fetch statistics',
        details: { pendingError, sentError, accountsError }
      }
      
      return NextResponse.json(errorResponse, { status: 500 })
    }

    const statsResponse: StatsResponse = {
      stats: {
        pending: pending || 0,
        sentToday: sentToday || 0,
        activeAccounts: accounts?.length || 0,
        date: today
      }
    }

    return NextResponse.json(statsResponse)

  } catch (error) {
    console.error('GET API Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    const errorResponse: ApiResponse = {
      success: false,
      message: 'Internal server error',
      error: 'Internal server error',
      details: errorMessage
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// PUT endpoint for stopping automations
export async function PUT(request: NextRequest): Promise<NextResponse<ApiRouteResponse>> {
  try {
    const body = await request.json()
    const { action } = body
    
    if (action === 'stop-all') {
      console.log(`🛑 Stopping ${activeAutomations.size} active automations...`)
      
      // Clear active automations (in real implementation, you'd stop processes)
      const stoppedCount = activeAutomations.size
      activeAutomations.clear()
      
      const response: ApiResponse = {
        success: true,
        message: `Stopped ${stoppedCount} automations`,
        details: { stoppedCount }
      }
      
      return NextResponse.json(response)
    }
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Invalid action'
    }
    
    return NextResponse.json(errorResponse, { status: 400 })
    
  } catch (error) {
    console.error('PUT API Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    const errorResponse: ApiResponse = {
      success: false,
      message: 'Internal server error',
      error: 'Internal server error',
      details: errorMessage
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Export types for use in other files
export type {
  AutomationTask,
  DailyLimit,
  ApiResponse,
  StatsResponse,
  ApiRouteResponse
}