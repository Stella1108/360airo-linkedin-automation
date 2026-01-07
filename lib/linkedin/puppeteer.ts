import puppeteer, { Browser, Page, ElementHandle } from 'puppeteer-core'
import { supabaseAdmin } from '../supabase'

// ✅ FIXED: More flexible data interface
export interface LinkedInActionResult {
  success: boolean
  message: string
  data?: Record<string, any>  // ✅ FIXED: Any object allowed
}

export async function executeLinkedInAction(params: {
  action: 'send_connection' | 'send_message' | 'visit_profile' | 'check_connection'
  targetProfile: string
  accountId: string
  customMessage?: string
}): Promise<LinkedInActionResult> {
  
  const supabase = supabaseAdmin

  try {
    // Get session
    const { data: session } = await supabase
      .from('linkedin_sessions_new')
      .select('cookies_encrypted, li_at_cookie, browser_agent, li_at_preview, id')
      .eq('account_id', params.accountId)
      .eq('is_active', true)
      .order('last_used', { ascending: false })
      .limit(1)
      .single()
    
    if (!session) {
      return { success: false, message: 'No active session' }
    }

    // Launch browser ✅ FIXED: headless: true
    const browser: Browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
        '--disable-gpu', '--no-first-run', '--disable-web-security'
      ]
    })

    const page: Page = await browser.newPage()
    
    // Set user agent
    await page.setUserAgent(session.browser_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    // Set cookies
    let cookiesUsed = 0
    if (session.cookies_encrypted) {
      try {
        const cookies = JSON.parse(session.cookies_encrypted)
        await page.setCookie(...cookies)
        cookiesUsed = cookies.length
      } catch {}
    }

    // Navigate ✅ FIXED: page.waitForTimeout()
    await page.goto(params.targetProfile, { waitUntil: 'networkidle2' })
    await new Promise(r => setTimeout(r, 3000))  // ✅ FIXED: Native timeout

    // Execute action
    const result = await executeAction(page, params)
    result.data = { ...(result.data || {}), cookiesUsed }

    // Update session
    if (session.id) {
      await supabase
        .from('linkedin_sessions_new')
        .update({ last_used: new Date().toISOString() })
        .eq('id', session.id)
    }

    await browser.close()
    return result

  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

async function executeAction(page: Page, params: any): Promise<LinkedInActionResult> {
  try {
    switch (params.action) {
      case 'send_connection':
        return await sendConnection(page, params)
      case 'check_connection':
        return await checkConnectionStatus(page)
      case 'visit_profile':
        return await visitProfile(page)
      default:
        return { success: true, message: 'Action completed' }
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

async function sendConnection(page: Page, params: any): Promise<LinkedInActionResult> {
  const connectSelectors = [
    '[data-test-id="connection_request_initiate"]',
    'button[aria-label*="Connect"]',
    '.artdeco-button--primary'
  ]

  // ✅ FIXED: Use page.$ for ElementHandle
  for (const selector of connectSelectors) {
    const connectButton = await page.$(selector)
    if (connectButton) {
      await connectButton.click()
      await new Promise(r => setTimeout(r, 1500))  // ✅ FIXED: Native timeout
      
      // Note textarea ✅ FIXED: Use page.$eval
      const hasNoteField = await page.evaluate((sel: string) => 
        !!document.querySelector(sel), 'textarea[placeholder*="message"]'
      )
      
      if (hasNoteField) {
        const message = params.customMessage?.replace('{{name}}', 'there') || 
          "Hi! I'd love to connect!"
        
        // ✅ FIXED: Use page.type with selector string
        await page.type('textarea[placeholder*="message"]', message, { delay: 50 })
        await new Promise(r => setTimeout(r, 500))
        
        // Send ✅ FIXED: Direct selector click
        await page.click('button[type="submit"], .artdeco-button--primary')
        await new Promise(r => setTimeout(r, 2000))
        
        return {
          success: true,
          message: '✅ Connection sent with note!',
          data: { sentMessage: message }
        }
      }
      
      return {
        success: true,
        message: '✅ Quick connection sent!',
        data: {}
      }
    }
  }

  return { 
    success: false, 
    message: 'Connect button not found' 
  }
}

async function checkConnectionStatus(page: Page): Promise<LinkedInActionResult> {
  const status = await page.evaluate(() => {
    const els = document.querySelectorAll('[data-test-id*="connection"]')
    for (const el of Array.from(els)) {
      const text = el.textContent?.toLowerCase() || ''
      if (text.includes('accepted') || text.includes('connected')) return 'accepted'
      if (text.includes('sent') || text.includes('pending')) return 'pending'
    }
    return 'unknown'
  })
  
  return {
    success: true,
    message: `Status: ${status}`,
    data: { status }
  }
}

async function visitProfile(page: Page): Promise<LinkedInActionResult> {
  const profileInfo = await page.evaluate(() => ({
    title: (document.querySelector('.text-heading-xlarge') as HTMLElement)?.textContent?.trim() || '',
    company: (document.querySelector('[data-test-id="profile-experience-title"]') as HTMLElement)?.textContent?.trim() || ''
  }))
  
  return {
    success: true,
    message: '✅ Profile visited',
    data: profileInfo as Record<string, any>  // ✅ FIXED: Type assertion
  }
}

export default executeLinkedInAction
