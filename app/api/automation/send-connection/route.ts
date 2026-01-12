import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { LinkedInConnector } from '@/lib/puppeteer-connector'

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  let connector: LinkedInConnector | null = null
  
  try {
    const body = await request.json()
    const { accountId, limit = 3 } = body

    if (!accountId) {
      return NextResponse.json(
        { success: false, message: 'Account ID is required' },
        { status: 400 }
      )
    }

    console.log(`🤖 Starting LinkedIn automation for account: ${accountId}`)

    // 1. Get account details
    const { data: account, error: accountError } = await supabaseAdmin
      .from('linkedin_accounts_new')
      .select('*')
      .eq('id', accountId)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { success: false, message: 'Account not found' },
        { status: 404 }
      )
    }

    // 2. Get active session for this account
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('linkedin_sessions_new')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .order('last_used', { ascending: true })
      .limit(1)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, message: 'No active session found for this account' },
        { status: 404 }
      )
    }

    console.log(`✅ Using session with li_at: ${session.li_at_cookie.substring(0, 20)}...`)

    // 3. Get profiles to connect with
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('sample_profiles')
      .select('*')
      .not('linkedin_profile_url_text', 'is', null)
      .limit(limit)

    if (profilesError || !profiles || profiles.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No profiles found to connect with' },
        { status: 404 }
      )
    }

    console.log(`📋 Found ${profiles.length} profiles to connect with`)

    // 4. Initialize LinkedIn Connector (YOUR PUPPETEER CODE)
    connector = new LinkedInConnector()
    
    const results = []
    
    // Process each profile
    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i]
      
      console.log(`\n🔗 Processing profile ${i + 1}/${profiles.length}: ${profile.name}`)
      
      try {
        // Create task object that matches your connector's expected format
        const task = {
          profile_url: profile.linkedin_profile_url_text,
          connection_note: `Hi ${profile.name.split('-')[0]}, I'd like to connect with you!`,
          session: {
            li_at_cookie: session.li_at_cookie,
            cookies_encrypted: session.cookies_encrypted || '',
            browser_agent: session.browser_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            last_used: session.last_used,
            cookie_count: session.cookie_count || 1,
            installation_id: session.installation_id
          },
          li_at_cookie: session.li_at_cookie
        }

        // 5. CALL YOUR PUPPETEER CONNECTOR HERE
        const result = await connector.sendConnection(task)
        
        results.push({
          profile: profile.name || 'Unknown',
          url: profile.linkedin_profile_url_text,
          success: result.success,
          status: result.status || 'unknown',
          message: result.message || 'No message',
          screenshot: result.screenshot // Base64 screenshot
        })
        
        console.log(`✅ ${result.success ? 'Success' : 'Failed'}: ${result.message}`)
        
        // Update session last_used after each successful attempt
        if (result.success) {
          await supabaseAdmin
            .from('linkedin_sessions_new')
            .update({ last_used: new Date().toISOString() })
            .eq('id', session.id)
        }
        
        // Add delay between connections (avoid rate limiting)
        if (i < profiles.length - 1) {
          console.log(`⏳ Waiting 10 seconds before next connection...`)
          await new Promise(resolve => setTimeout(resolve, 10000))
        }
        
      } catch (error) {
        console.error(`❌ Error processing profile ${profile.name}:`, error)
        results.push({
          profile: profile.name || 'Unknown',
          url: profile.linkedin_profile_url_text,
          success: false,
          status: 'failed',
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }

    // 6. Close the connector
    if (connector) {
      await connector.close()
    }

    const successfulConnections = results.filter(r => r.success).length
    
    // 7. Log results to database
    for (const result of results) {
      await supabaseAdmin
        .from('connection_results')
        .insert([{
          account_id: accountId,
          success: result.success,
          status: result.status,
          error_message: result.success ? null : result.message,
          screenshot_base64: result.screenshot,
          profile_url: result.url,
          profile_name: result.profile,
          timestamp: new Date().toISOString()
        }])
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful: successfulConnections,
      message: `Processed ${results.length} profiles. ${successfulConnections} successful.`,
      results
    })

  } catch (error) {
    console.error('💥 Fatal error in automation:', error)
    
    // Ensure connector is closed even on error
    if (connector) {
      try {
        await connector.close()
      } catch (closeError) {
        console.error('Error closing connector:', closeError)
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    )
  }
}