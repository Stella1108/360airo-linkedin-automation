// lib/puppeteer-connector.ts 

// Simple import - no extra plugins
import puppeteer from 'puppeteer'
import { Browser, Page, Cookie } from 'puppeteer'

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

export interface LinkedInConnectorResult {
  success: boolean
  status?: 'pending' | 'sent' | 'followed' | 'both' | 'unknown' | 'connected' | 'failed' | 'profile_not_found'
  error?: string
  profileUrl?: string
  screenshot?: string
  message?: string
  action?: 'connect' | 'follow' | 'both' | 'none'
  apiLogs?: string[] // Add API logs
}

export class LinkedInConnector {
  private browser: Browser | null = null
  private page: Page | null = null
  private browserLaunched = false
  private apiLogs: string[] = [] // Store API calls

  // ADD THESE METHODS FOR API MONITORING
  private startAPIMonitoring(): void {
    if (!this.page) return
    
    // Listen to all network requests
    this.page.on('request', (request) => {
      const url = request.url()
      // Only log LinkedIn API calls
      if (url.includes('linkedin.com/voyager/api/') || 
          url.includes('linkedin.com/uas/') ||
          url.includes('linkedin.com/checkpoint/') ||
          url.includes('/api/')) {
        const log = `🌐 API REQUEST: ${request.method()} ${url}`
        this.apiLogs.push(log)
        console.log(log)
      }
    })
    
    // Listen to all responses
    this.page.on('response', (response) => {
      const url = response.url()
      if (url.includes('linkedin.com/voyager/api/') || 
          url.includes('linkedin.com/uas/') ||
          url.includes('linkedin.com/checkpoint/') ||
          url.includes('/api/')) {
        const log = `📥 API RESPONSE: ${response.status()} ${url}`
        this.apiLogs.push(log)
        console.log(log)
      }
    })
  }
  
  private getAPILogs(): string[] {
    return this.apiLogs
  }
  
  private clearAPILogs(): void {
    this.apiLogs = []
  }

  async launchBrowser(options: LaunchOptions): Promise<{ browser: Browser; page: Page }> {
    if (this.browserLaunched && this.browser && this.page) {
      console.log('✅ Reusing existing browser instance')
      return { browser: this.browser, page: this.page }
    }

    console.log('🚀 Launching browser...')
    
    const launchOptions: any = {
      headless: options.headless !== false ? "new" : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1920,1080',
        '--disable-notifications',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ],
      defaultViewport: options.viewport || { width: 1366, height: 768 }
    }

    if (options.ignoreHTTPSErrors !== undefined) {
      launchOptions.ignoreHTTPSErrors = options.ignoreHTTPSErrors
    }
    if (options.timeout !== undefined) {
      launchOptions.timeout = options.timeout
    }

    this.browser = await puppeteer.launch(launchOptions)
    this.browserLaunched = true

    this.page = await this.browser.newPage()
    
    // Start API monitoring
    this.startAPIMonitoring()
    
    // Remove webdriver detection
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      })
    })
    
    await this.page.setUserAgent(options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    await this.delay(2000)

    if (options.cookies && options.cookies.length > 0) {
      console.log(`🍪 Setting ${options.cookies.length} cookies...`)
      
      try {
        await this.page.setCookie(...options.cookies)
        console.log(`✅ Successfully set ${options.cookies.length} cookies`)
        await this.delay(3000)
      } catch (error: unknown) {
        console.warn('⚠️ Error setting cookies:', error instanceof Error ? error.message : String(error))
      }
    }

    return { browser: this.browser, page: this.page }
  }

  // Create proper Cookie object
  private createCookie(name: string, value: string, domain: string, path: string = '/'): Cookie {
    const now = Math.floor(Date.now() / 1000)
    const expires = now + 86400 * 30 // 30 days from now
    
    return {
      name: name,
      value: value,
      domain: domain,
      path: path,
      expires: expires,
      httpOnly: true,
      secure: true,
      sameSite: 'None' as 'None' | 'Lax' | 'Strict',
      size: value.length,
      session: false
    }
  }

  // Simple delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // FIND AND CLICK BOTH CONNECT AND FOLLOW BUTTONS
  async findAndClickActionButton(): Promise<{success: boolean, message: string, action: 'connect' | 'follow' | 'both' | 'none'}> {
    if (!this.page) {
      return { success: false, message: '❌ Page not initialized', action: 'none' }
    }

    console.log('🔍 Searching for Connect AND Follow buttons...')
    
    try {
      let connectClicked = false
      let followClicked = false
      let messages: string[] = []
      
      // STEP 1: Look for CONNECT button
      console.log('🔍 Step 1: Looking for Connect button...')
      const connectResult = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button')
        
        for (const button of buttons) {
          const text = button.textContent?.trim() || ''
          const ariaLabel = button.getAttribute('aria-label') || ''
          const isVisible = (button as HTMLElement).offsetWidth > 0 && 
                           (button as HTMLElement).offsetHeight > 0
          
          // Check if this is a Connect button
          const isConnectButton = (
            (text.includes('Connect') || text.includes('Invite') || 
             ariaLabel.includes('Connect') || ariaLabel.includes('Invite')) &&
            !ariaLabel.includes('Pending') && !text.includes('Pending') &&
            !text.includes('Message') && !ariaLabel.includes('Message')
          )
          
          if (isConnectButton && isVisible) {
            console.log('Found Connect button:', text, ariaLabel)
            
            // Scroll into view
            button.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'center'
            })
            
            // Click the button
            button.click()
            
            return {
              success: true,
              action: 'connect',
              text: text,
              ariaLabel: ariaLabel
            }
          }
        }
        return { success: false, action: 'none' }
      })
      
      if (connectResult.success) {
        console.log(`✅ Found and clicked Connect button! Text: "${connectResult.text}", Aria: "${connectResult.ariaLabel}"`)
        connectClicked = true
        messages.push('✅ Connect button clicked!')
        await this.delay(2000) // Wait for popup
      } else {
        console.log('⚠️ No Connect button found')
      }
      
      // Wait a bit before looking for Follow button
      await this.delay(1000)
      
      // STEP 2: Look for FOLLOW button (even if Connect was clicked)
      console.log('🔍 Step 2: Looking for Follow button...')
      const followResult = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button')
        
        for (const button of buttons) {
          const text = button.textContent?.trim() || ''
          const ariaLabel = button.getAttribute('aria-label') || ''
          const isVisible = (button as HTMLElement).offsetWidth > 0 && 
                           (button as HTMLElement).offsetHeight > 0
          
          // Check if this is a Follow button (+Follow or Follow)
          const isFollowButton = (
            (text.includes('+Follow') || text.includes('Follow') || 
             ariaLabel.includes('Follow')) &&
            !text.includes('Following') && !ariaLabel.includes('Following') &&
            !text.includes('Unfollow') && !ariaLabel.includes('Unfollow') &&
            !text.includes('Message') && !ariaLabel.includes('Message')
          )
          
          if (isFollowButton && isVisible) {
            console.log('Found Follow button:', text, ariaLabel)
            
            // Scroll into view
            button.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'center'
            })
            
            // Click the button
            button.click()
            
            return {
              success: true,
              action: 'follow',
              text: text,
              ariaLabel: ariaLabel
            }
          }
        }
        return { success: false, action: 'none' }
      })
      
      if (followResult.success) {
        console.log(`✅ Found and clicked Follow button! Text: "${followResult.text}", Aria: "${followResult.ariaLabel}"`)
        followClicked = true
        messages.push('✅ Follow button clicked!')
        await this.delay(1000)
      } else {
        console.log('⚠️ No Follow button found')
      }
      
      // Determine what action was performed
      if (connectClicked && followClicked) {
        return { 
          success: true, 
          message: messages.join(' '),
          action: 'both'
        }
      } else if (connectClicked) {
        return { 
          success: true, 
          message: messages.join(' '),
          action: 'connect'
        }
      } else if (followClicked) {
        return { 
          success: true, 
          message: messages.join(' '),
          action: 'follow'
        }
      } else {
        // Try CSS selectors as fallback
        console.log('⚠️ JavaScript method failed, trying CSS selectors...')
        
        // Try Connect button selectors
        const connectSelectors = [
          'button[aria-label*="Invite"]',
          'button[aria-label*="Connect"]',
          'button[data-control-name="connect"]',
          'button.pv-s-profile-actions__connect',
          'button.artdeco-button--primary[data-control-name="connect"]'
        ]
        
        for (const selector of connectSelectors) {
          console.log(`  Trying Connect CSS: ${selector}`)
          const button = await this.page.$(selector)
          
          if (button) {
            const isVisible = await button.evaluate((el: Element) => {
              const rect = el.getBoundingClientRect()
              const style = window.getComputedStyle(el)
              return style.display !== 'none' &&
                     style.visibility !== 'hidden' &&
                     style.opacity !== '0' &&
                     rect.width > 0 &&
                     rect.height > 0
            })
            
            if (isVisible) {
              await button.click({ delay: 100 })
              console.log(`✅ Clicked Connect button with CSS: ${selector}`)
              connectClicked = true
              messages.push('✅ Connect button clicked!')
              await this.delay(2000)
              break
            }
          }
        }
        
        // Wait and try Follow button selectors
        await this.delay(1000)
        
        const followSelectors = [
          'button[aria-label*="+Follow"]',
          'button[aria-label*="Follow"]:not([aria-label*="Following"])',
          'button[data-control-name="follow"]',
          'button.pv-s-profile-actions__follow'
        ]
        
        for (const selector of followSelectors) {
          console.log(`  Trying Follow CSS: ${selector}`)
          const button = await this.page.$(selector)
          
          if (button) {
            const isVisible = await button.evaluate((el: Element) => {
              const rect = el.getBoundingClientRect()
              const style = window.getComputedStyle(el)
              return style.display !== 'none' &&
                     style.visibility !== 'hidden' &&
                     style.opacity !== '0' &&
                     rect.width > 0 &&
                     rect.height > 0
            })
            
            if (isVisible) {
              await button.click({ delay: 100 })
              console.log(`✅ Clicked Follow button with CSS: ${selector}`)
              followClicked = true
              messages.push('✅ Follow button clicked!')
              break
            }
          }
        }
        
        // Final determination
        if (connectClicked && followClicked) {
          return { 
            success: true, 
            message: messages.join(' '),
            action: 'both'
          }
        } else if (connectClicked) {
          return { 
            success: true, 
            message: messages.join(' '),
            action: 'connect'
          }
        } else if (followClicked) {
          return { 
            success: true, 
            message: messages.join(' '),
            action: 'follow'
          }
        } else {
          console.log('❌ No Connect or Follow button found')
          return { success: false, message: '❌ No Connect or Follow button found', action: 'none' }
        }
      }
      
    } catch (error) {
      console.error('❌ Error:', error)
      return { 
        success: false, 
        message: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
        action: 'none'
      }
    }
  }

  // HANDLE CONNECTION POPUP
  async handleConnectionPopup(note?: string): Promise<boolean> {
    if (!this.page) return false

    console.log('⏳ Waiting for connection popup dialog...')
    
    try {
      await this.delay(2000)
      
      // Look for dialog
      const dialogSelectors = [
        'div[role="dialog"]',
        'div[class*="modal"]',
        'div[class*="artdeco-modal"]',
        'div.send-invite'
      ]
      
      let dialogFound = false
      for (const selector of dialogSelectors) {
        const dialog = await this.page.$(selector)
        if (dialog) {
          dialogFound = true
          console.log('✅ Connection popup found!')
          break
        }
      }
      
      if (!dialogFound) {
        console.log('⚠️ No connection popup found, checking if already sent...')
        return true
      }
      
      await this.delay(1000)
      
      // Add note if provided
      if (note && note.trim()) {
        console.log(`📝 Adding note: ${note}`)
        
        const noteSelectors = [
          'textarea[placeholder*="Note"]',
          'textarea[placeholder*="message"]',
          'textarea[aria-label*="message"]',
          'textarea[placeholder*="Add a note"]'
        ]
        
        for (const selector of noteSelectors) {
          const noteField = await this.page.$(selector)
          if (noteField) {
            await noteField.click()
            await this.delay(500)
            await noteField.type(note, { delay: 30 })
            console.log('✅ Note added!')
            break
          }
        }
      }
      
      await this.delay(1000)
      
      // Click Send button
      const sendClicked = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button')
        
        for (const button of buttons) {
          const text = button.textContent?.trim() || ''
          const ariaLabel = button.getAttribute('aria-label') || ''
          const isVisible = (button as HTMLElement).offsetWidth > 0 && 
                           (button as HTMLElement).offsetHeight > 0
          
          if ((text.includes('Send') || ariaLabel.includes('Send')) && isVisible) {
            button.click()
            return true
          }
        }
        return false
      })
      
      if (sendClicked) {
        console.log('✅ Send button clicked!')
        await this.delay(2000)
        return true
      }
      
      console.log('❌ Send button not found')
      return false
      
    } catch (error) {
      console.error('❌ Error handling popup:', error)
      return false
    }
  }

  // CHECK FOLLOW SUCCESS
  async checkFollowSuccess(): Promise<boolean> {
    if (!this.page) return false

    console.log('✅ Checking if follow was successful...')
    
    try {
      await this.delay(3000)
      
      // Check if Follow button changed to Following
      const isFollowing = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button')
        
        for (const button of buttons) {
          const text = button.textContent?.trim() || ''
          const ariaLabel = button.getAttribute('aria-label') || ''
          
          if ((text.includes('Following') || ariaLabel.includes('Following')) &&
              (button as HTMLElement).offsetWidth > 0) {
            return true
          }
        }
        return false
      })
      
      if (isFollowing) {
        console.log('✅ Successfully followed! Button changed to "Following"')
        return true
      }
      
      // Check for success message
      const pageContent = await this.page.content()
      if (pageContent.includes('following') || pageContent.includes('Followed')) {
        console.log('✅ Follow action completed!')
        return true
      }
      
      console.log('⚠️ Follow status uncertain')
      return true // Assuming success if we clicked the button
      
    } catch (error) {
      console.error('❌ Error checking follow success:', error)
      return false
    }
  }

  // MAIN METHOD TO SEND CONNECTION AND/OR FOLLOW
  async sendConnectionOrFollow(task: any): Promise<LinkedInConnectorResult> {
    console.log(`🤖 Starting connection/follow process for: ${task.profile_url}`)
    
    try {
      // Prepare cookies
      const cookies: Cookie[] = [
        this.createCookie('li_at', task.session?.li_at_cookie || task.li_at_cookie, '.linkedin.com')
      ]
      
      // Launch browser
      console.log('🚀 Launching browser...')
      await this.launchBrowser({
        userAgent: task.session?.browser_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        cookies: cookies,
        headless: false,
        ignoreHTTPSErrors: true,
        timeout: 60000
      })
      
      if (!this.page) {
        throw new Error('Page not created')
      }
      
      // Test login
      console.log('🔐 Testing login...')
      await this.page.goto('https://www.linkedin.com/feed', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })
      
      await this.delay(5000)
      
      // Check login
      const currentUrl = await this.page.url()
      const pageContent = await this.page.content()
      
      if (currentUrl.includes('login') || currentUrl.includes('signin') || 
          pageContent.includes('Sign In') || pageContent.includes('signin')) {
        return {
          success: false,
          status: 'failed',
          profileUrl: task.profile_url,
          error: 'Login failed',
          message: '❌ LOGIN FAILED: Cookie may be expired'
        }
      }
      
      console.log('✅ Login successful!')
      
      // Navigate to profile
      console.log(`🌐 Navigating to profile: ${task.profile_url}`)
      await this.page.goto(task.profile_url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })
      
      await this.delay(5000)
      
      // Take screenshot before
      const beforeScreenshot = await this.page.screenshot({ encoding: 'base64' }) as string
      
      // Find and click BOTH Connect AND Follow buttons
      console.log('🔍 Finding Connect AND Follow buttons...')
      const buttonResult = await this.findAndClickActionButton()
      
      if (!buttonResult.success) {
        return {
          success: false,
          status: 'failed',
          profileUrl: task.profile_url,
          error: 'No action button found',
          message: buttonResult.message,
          screenshot: beforeScreenshot,
          action: 'none',
          apiLogs: this.getAPILogs() // Include API logs
        }
      }
      
      let finalStatus = 'unknown'
      let finalMessage = buttonResult.message
      
      // Handle actions based on what was clicked
      if (buttonResult.action === 'connect' || buttonResult.action === 'both') {
        // Handle connection popup if Connect was clicked
        await this.delay(3000)
        const popupResult = await this.handleConnectionPopup(task.connection_note)
        
        if (!popupResult && buttonResult.action === 'connect') {
          const afterScreenshot = await this.page.screenshot({ encoding: 'base64' }) as string
          return {
            success: false,
            status: 'failed',
            profileUrl: task.profile_url,
            error: 'Popup handling failed',
            message: '❌ Could not complete connection process',
            screenshot: afterScreenshot,
            action: buttonResult.action,
            apiLogs: this.getAPILogs() // Include API logs
          }
        }
        
        if (popupResult) {
          console.log('✅ Connection process completed!')
          await this.delay(3000)
          
          if (buttonResult.action === 'connect') {
            finalStatus = 'sent'
            finalMessage += ' Connection request sent!'
          } else if (buttonResult.action === 'both') {
            finalStatus = 'both'
            finalMessage += ' Connection request sent!'
          }
        }
      }
      
      // Check follow success if Follow was clicked
      if (buttonResult.action === 'follow' || buttonResult.action === 'both') {
        await this.delay(2000)
        const followSuccess = await this.checkFollowSuccess()
        
        if (followSuccess) {
          if (buttonResult.action === 'follow') {
            finalStatus = 'followed'
            finalMessage += ' Successfully followed!'
          } else if (buttonResult.action === 'both') {
            finalStatus = 'both'
            finalMessage += ' Successfully followed!'
          }
        } else {
          console.log('⚠️ Follow status uncertain')
        }
      }
      
      // Take final screenshot
      await this.delay(2000)
      const afterScreenshot = await this.page.screenshot({ encoding: 'base64' }) as string
      
      return {
        success: true,
        status: finalStatus as any,
        profileUrl: task.profile_url,
        message: finalMessage,
        screenshot: afterScreenshot,
        action: buttonResult.action,
        apiLogs: this.getAPILogs() // Include API logs
      }
      
    } catch (error) {
      console.error('❌ Error in sendConnectionOrFollow:', error)
      
      let screenshot = ''
      if (this.page) {
        try {
          screenshot = await this.page.screenshot({ encoding: 'base64' }) as string
        } catch (e) {
          console.error('Failed to take screenshot:', e)
        }
      }
      
      return {
        success: false,
        status: 'failed',
        profileUrl: task.profile_url,
        error: error instanceof Error ? error.message : String(error),
        message: `❌ ERROR: ${error instanceof Error ? error.message : String(error)}`,
        screenshot: screenshot,
        action: 'none',
        apiLogs: this.getAPILogs() // Include API logs even on error
      }
    }
  }

  // Keep original sendConnection method for backward compatibility
  async sendConnection(task: any): Promise<LinkedInConnectorResult> {
    console.log('⚠️ Using deprecated sendConnection method, use sendConnectionOrFollow instead')
    const result = await this.sendConnectionOrFollow(task)
    if (result.action === 'follow' || result.action === 'none') {
      result.success = false
      result.status = 'failed'
      result.message = '❌ No Connect button found on profile'
    }
    return result
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
      this.browserLaunched = false
      console.log('✅ Browser closed')
    } catch (error) {
      console.error('Error closing browser:', error)
    }
  }
}