// lib/puppeteer-connector.ts - COMPLETE FIXED VERSION
import puppeteer, { Browser, Page, Cookie } from 'puppeteer'

export interface LaunchOptions {
  userAgent: string
  cookies: Cookie[]
  headless?: boolean
  viewport?: { width: number; height: number }
  ignoreHTTPSErrors?: boolean
  timeout?: number
}

export interface LinkedInSession {
  li_at_cookie: string
  cookies_encrypted: string
  browser_agent: string
  last_used: string
  cookie_count: number
  installation_id?: string
}

export interface RawCookie {
  name: string
  value: string
  domain: string
  path?: string
  expirationDate?: number
  hostOnly?: boolean
  httpOnly: boolean
  secure: boolean
  session?: boolean
  storeId?: string
  sameSite?: 'Strict' | 'Lax' | 'None' | string
}

export interface LinkedInConnectorResult {
  success: boolean
  status?: 'pending' | 'sent' | 'unknown'
  error?: string
  profileUrl?: string
  screenshot?: string
}

export class LinkedInConnector {
  private browser: Browser | null = null
  private page: Page | null = null

  async launchBrowser(options: LaunchOptions): Promise<{ browser: Browser; page: Page }> {
    console.log('🚀 Launching browser with anti-detection...')
    
    const launchOptions: any = {
      headless: options.headless !== false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        `--user-agent=${options.userAgent}`,
        '--window-size=1920,1080',
        '--disable-infobars',
        '--disable-notifications',
        '--disable-popup-blocking'
      ],
      defaultViewport: options.viewport || {
        width: 1920,
        height: 1080
      }
    }

    if (options.ignoreHTTPSErrors !== undefined) {
      launchOptions.ignoreHTTPSErrors = options.ignoreHTTPSErrors
    }
    if (options.timeout !== undefined) {
      launchOptions.timeout = options.timeout
    }

    this.browser = await puppeteer.launch(launchOptions)

    this.page = await this.browser.newPage()
    
    // Set extra headers to look more human
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    })

    // Set user agent
    await this.page.setUserAgent(options.userAgent)

    // Set cookies if provided
    if (options.cookies && options.cookies.length > 0) {
      console.log(`🍪 Setting ${options.cookies.length} cookies...`)
      
      // Debug: Show what cookies we're setting
      console.log('🔍 Cookies being set:')
      options.cookies.slice(0, 5).forEach((cookie, index) => {
        console.log(`${index + 1}. ${cookie.name} = ${cookie.value.substring(0, 20)}...`)
      })
      if (options.cookies.length > 5) {
        console.log(`... and ${options.cookies.length - 5} more cookies`)
      }
      
      try {
        // Set ALL cookies at once
        await this.page.setCookie(...options.cookies)
        console.log(`✅ Successfully set ${options.cookies.length} cookies`)
      } catch (error: unknown) {
        console.warn('⚠️ Error setting cookies:', 
          error instanceof Error ? error.message : String(error))
        
        // Try setting in batches
        const batches = this.chunkArray(options.cookies, 5)
        let successfulCookies = 0
        for (const batch of batches) {
          try {
            await this.page.setCookie(...batch)
            successfulCookies += batch.length
          } catch (batchError) {
            console.warn('⚠️ Some cookies failed to set')
          }
        }
        console.log(`✅ Set ${successfulCookies} of ${options.cookies.length} cookies`)
      }
    }

    // Remove automation detection
    await this.page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      })

      // Overwrite plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      })

      // Overwrite languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      })
    })

    return { browser: this.browser, page: this.page }
  }

  async navigateAndVerifyLogin(targetUrl?: string): Promise<{ loggedIn: boolean; page: Page; redirectUrl?: string }> {
    if (!this.page) throw new Error('Page not initialized')

    console.log('🌐 Navigating to LinkedIn homepage...')
    
    // Go to homepage FIRST
    await this.page.goto('https://www.linkedin.com', {
      waitUntil: 'networkidle2',
      timeout: 30000
    })

    // Wait for page to settle
    await this.delay(3000)

    const currentUrl = this.page.url()
    console.log(`📍 Landed at: ${currentUrl}`)

    // Check if redirected to login
    if (currentUrl.includes('login') || currentUrl.includes('auth')) {
      console.log('❌ Redirected to login page')
      return { loggedIn: false, page: this.page, redirectUrl: currentUrl }
    }

    // Check for logged-in indicators
    const isLoggedIn = await this.checkIfLoggedIn(this.page)
    
    if (isLoggedIn) {
      console.log('✅ Successfully logged in!')
      
      // Navigate to target if provided
      if (targetUrl) {
        console.log(`🎯 Navigating to target: ${targetUrl}`)
        await this.page.goto(targetUrl, {
          waitUntil: 'networkidle0',
          timeout: 20000
        })
      }
      
      return { loggedIn: true, page: this.page }
    } else {
      console.log('❌ Not logged in')
      return { loggedIn: false, page: this.page }
    }
  }

  async checkIfLoggedIn(page: Page): Promise<boolean> {
    try {
      // Method 1: Check for user avatar
      const avatar = await page.$('img.global-nav__me-photo, img[data-test-global-nav-user-avatar]')
      if (avatar) {
        console.log('✅ Found user avatar - definitely logged in')
        return true
      }

      // Method 2: Check for navigation menu
      const navMenu = await page.$('nav.global-nav, header[data-test-global-nav]')
      if (navMenu) {
        console.log('✅ Found navigation menu - likely logged in')
        return true
      }

      // Method 3: Check page content
      const content = await page.content()
      const loggedInIndicators = [
        'My Network',
        'Jobs',
        'Messaging',
        'Notifications',
        'Me'
      ]

      for (const indicator of loggedInIndicators) {
        if (content.includes(indicator)) {
          console.log(`✅ Found "${indicator}" - logged in`)
          return true
        }
      }

      // Method 4: Check for login form (negative indicator)
      const loginForm = await page.$('#username, #password, input[name="session_key"]')
      if (loginForm) {
        console.log('❌ Found login form - not logged in')
        return false
      }

      console.log('⚠️ Could not determine login status')
      return false
    } catch (error) {
      console.error('Error checking login status:', error)
      return false
    }
  }

  async sendConnectionRequest(profileUrl: string, note?: string): Promise<{
    success: boolean
    message: string
    status: 'sent' | 'pending' | 'connected' | 'failed'
  }> {
    if (!this.page) throw new Error('Page not initialized')

    try {
      console.log(`🎯 Navigating to profile: ${profileUrl}`)
      await this.page.goto(profileUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000
      })

      // Check connection status
      const status = await this.checkConnectionStatus()
      
      if (status === 'connected') {
        return {
          success: true,
          message: 'Already connected',
          status: 'connected'
        }
      }

      if (status === 'pending') {
        return {
          success: true,
          message: 'Connection already pending',
          status: 'pending'
        }
      }

      // Send connection request
      console.log('📤 Sending connection request...')
      const result = await this.clickConnectButton(note)
      
      if (result) {
        return {
          success: true,
          message: 'Connection request sent successfully',
          status: 'sent'
        }
      } else {
        return {
          success: false,
          message: 'Failed to send connection request',
          status: 'failed'
        }
      }

    } catch (error) {
      console.error('Error sending connection:', error)
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        status: 'failed'
      }
    }
  }

  // ADD THIS METHOD - Fixes the route.ts error
  async sendConnection(task: any): Promise<LinkedInConnectorResult> {
    try {
      console.log(`📤 Starting connection process for: ${task.profile_url}`)
      
      // Initialize browser if not already done
      if (!this.page || !this.browser) {
        // You need to provide proper launch options here
        // For now, using defaults
        await this.launchBrowser({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          cookies: [],
          headless: true
        })
      }

      // Use the existing sendConnectionRequest method
      const result = await this.sendConnectionRequest(task.profile_url, task.connection_note || '')
      
      // Take screenshot for verification
      let screenshotBase64 = ''
      if (this.page) {
        try {
          const screenshot = await this.page.screenshot({ encoding: 'base64' })
          screenshotBase64 = `data:image/png;base64,${screenshot}`
        } catch (screenshotError) {
          console.warn('⚠️ Could not take screenshot:', screenshotError)
        }
      }
      
      // Map the result to LinkedInConnectorResult interface
      const mappedResult: LinkedInConnectorResult = {
        success: result.success,
        profileUrl: task.profile_url,
        screenshot: screenshotBase64 || undefined
      }
      
      // Map status
      if (result.status === 'sent') {
        mappedResult.status = 'sent'
      } else if (result.status === 'pending') {
        mappedResult.status = 'pending'
      } else if (result.status === 'connected') {
        mappedResult.status = 'sent' // Treat as already sent
      } else {
        mappedResult.status = 'unknown'
      }
      
      // Map error
      if (!result.success && result.message) {
        mappedResult.error = result.message
      }
      
      return mappedResult

    } catch (error) {
      console.error('Error in sendConnection:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        status: 'unknown'
      }
    }
  }

  private async checkConnectionStatus(): Promise<'connected' | 'pending' | 'not_connected'> {
    if (!this.page) return 'not_connected'

    await this.delay(2000)

    // Check for "Message" button (already connected)
    const messageButton = await this.page.$('button:has-text("Message")')
    if (messageButton) {
      console.log('✅ Already connected (Message button found)')
      return 'connected'
    }

    // Check for "Pending" button
    const pendingButton = await this.page.$('button:has-text("Pending")')
    if (pendingButton) {
      console.log('⚠️ Connection already pending')
      return 'pending'
    }

    // Check for "Connect" button
    const connectButton = await this.page.$('button:has-text("Connect")')
    if (connectButton) {
      console.log('✅ Can send connection request')
      return 'not_connected'
    }

    // Check for "Follow" button (can't connect)
    const followButton = await this.page.$('button:has-text("Follow")')
    if (followButton) {
      console.log('⚠️ Can only follow, not connect')
      return 'connected' // Treat as already connected
    }

    console.log('⚠️ Could not find connection button')
    return 'not_connected'
  }

  private async clickConnectButton(note?: string): Promise<boolean> {
    if (!this.page) return false

    try {
      // Click Connect button
      const connectButton = await this.page.waitForSelector(
        'button:has-text("Connect"), button[aria-label*="Connect"], button[data-control-name="connect"]',
        { timeout: 10000 }
      )
      
      if (!connectButton) {
        console.error('❌ Connect button not found')
        return false
      }
      
      await connectButton.click()
      await this.delay(2000)

      // Check if "Add a note" modal appears
      try {
        const addNoteButton = await this.page.waitForSelector('button:has-text("Add a note")', { timeout: 3000 })
        
        if (addNoteButton && note) {
          await addNoteButton.click()
          await this.delay(1000)
          
          // Fill note
          const noteTextarea = await this.page.$('textarea[name="message"]')
          if (noteTextarea) {
            await noteTextarea.evaluate((el: HTMLTextAreaElement, text: string) => {
              el.value = text
            }, note)
            await this.delay(1000)
          }
        }
      } catch (error) {
        console.log('No note modal found, sending without note')
      }

      // Click Send button
      const sendButton = await this.page.waitForSelector(
        'button:has-text("Send"), button[aria-label*="Send"]',
        { timeout: 5000 }
      )
      
      if (!sendButton) {
        console.error('❌ Send button not found')
        return false
      }
      
      await sendButton.click()
      await this.delay(3000)

      // Verify success
      const pendingIndicator = await this.page.$('button:has-text("Pending"), span:has-text("Pending")')
      return !!pendingIndicator

    } catch (error) {
      console.error('Error clicking connect button:', error)
      return false
    }
  }

  async takeScreenshot(path: string): Promise<void> {
    if (this.page) {
      try {
        await this.page.screenshot({ path, fullPage: false })
        console.log(`📸 Screenshot saved: ${path}`)
      } catch (error) {
        console.error('Error taking screenshot:', error)
      }
    }
  }

  async getPageContent(): Promise<string> {
    if (!this.page) return ''
    return await this.page.content()
  }

  async getCurrentUrl(): Promise<string> {
    if (!this.page) return ''
    return this.page.url()
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async close(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close()
        this.page = null
      }
      if (this.browser) {
        await this.browser.close()
        this.browser = null
      }
      console.log('✅ Browser closed')
    } catch (error) {
      console.error('Error closing browser:', error)
    }
  }

  // FIXED: Extract ALL cookies from session data
  static prepareCookiesFromSession(session: LinkedInSession): Cookie[] {
    try {
      if (!session.cookies_encrypted) {
        console.log('❌ No cookies_encrypted field in session')
        return []
      }

      console.log(`🔍 Extracting cookies from session data...`)
      console.log(`📏 cookies_encrypted length: ${session.cookies_encrypted.length}`)

      // Decode the URL-encoded cookies
      const decoded = decodeURIComponent(session.cookies_encrypted)
      const rawCookies: RawCookie[] = JSON.parse(decoded)

      console.log(`✅ Found ${rawCookies.length} raw cookies in database`)
      console.log(`🎯 Database shows: ${session.cookie_count} cookies`)

      // Prepare ALL cookies for Puppeteer (DO NOT FILTER!)
      const preparedCookies: Cookie[] = []
      
      for (const rawCookie of rawCookies) {
        try {
          // Skip cookies with no value
          if (!rawCookie.value || rawCookie.value.trim() === '') {
            console.log(`⚠️ Skipping empty cookie: ${rawCookie.name}`)
            continue
          }
          
          // Fix domain issues
          let domain = rawCookie.domain
          if (domain === '.www.linkedin.com') {
            domain = '.linkedin.com'
          }
          
          // Ensure domain starts with . for cross-subdomain
          if (domain && !domain.startsWith('.') && domain.includes('linkedin.com')) {
            domain = '.' + domain
          }

          // Create Cookie object
          const preparedCookie: Cookie = {
            name: rawCookie.name,
            value: rawCookie.value,
            domain: domain || '.linkedin.com',
            path: rawCookie.path || '/',
            expires: rawCookie.expirationDate || Math.floor(Date.now() / 1000) + 86400,
            httpOnly: rawCookie.httpOnly || false,
            secure: rawCookie.secure !== false,
            sameSite: (rawCookie.sameSite as 'Strict' | 'Lax' | 'None') || 'None',
            size: rawCookie.value.length,
            session: rawCookie.session || false
          }
          
          preparedCookies.push(preparedCookie)
        } catch (cookieError) {
          console.warn(`⚠️ Error preparing cookie ${rawCookie.name}:`, cookieError)
        }
      }

      console.log(`✅ Prepared ${preparedCookies.length} cookies for automation`)
      console.log(`🚀 Will set ${preparedCookies.length} cookies in browser`)

      // Check for critical cookies
      const criticalCookies = ['li_at', 'JSESSIONID', 'bcookie', 'bscookie', 'li_rm']
      let criticalCount = 0
      for (const name of criticalCookies) {
        const found = preparedCookies.find(c => c.name === name)
        console.log(`${found ? '✅' : '❌'} ${name}: ${found ? 'PRESENT' : 'MISSING'}`)
        if (found) criticalCount++
      }

      if (criticalCount < 3) {
        console.warn('⚠️ Warning: Missing critical cookies, automation may fail')
      }

      return preparedCookies

    } catch (error) {
      console.error('❌ Error preparing cookies:', error)
      console.error('Error details:', error instanceof Error ? error.message : String(error))
      return []
    }
  }
}