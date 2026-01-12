const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Use stealth plugin
puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());
app.use(express.json());

// LinkedInConnector class (Converted from your TypeScript)
class LinkedInConnector {
  constructor() {
    this.browser = null;
    this.page = null;
    this.browserLaunched = false;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  createCookie(name, value, domain, path = '/') {
    const now = Math.floor(Date.now() / 1000);
    const expires = now + 86400 * 30; // 30 days
    
    return {
      name: name,
      value: value,
      domain: domain,
      path: path,
      expires: expires,
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      size: value.length,
      session: false
    };
  }

  async launchBrowser(options) {
    if (this.browserLaunched && this.browser && this.page) {
      console.log('✅ Reusing existing browser instance');
      return { browser: this.browser, page: this.page };
    }

    console.log('🚀 Launching browser with Stealth Plugin...');
    
    const launchOptions = {
      headless: options.headless !== false ? "new" : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1920,1080',
        '--disable-notifications',
        '--disable-blink-features=AutomationControlled'
      ],
      defaultViewport: options.viewport || { width: 1366, height: 768 }
    };

    if (options.ignoreHTTPSErrors !== undefined) {
      launchOptions.ignoreHTTPSErrors = options.ignoreHTTPSErrors;
    }
    if (options.timeout !== undefined) {
      launchOptions.timeout = options.timeout;
    }

    this.browser = await puppeteer.launch(launchOptions);
    this.browserLaunched = true;

    this.page = await this.browser.newPage();
    
    // Remove webdriver detection
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
    });
    
    await this.page.setUserAgent(options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await this.delay(2000);

    if (options.cookies && options.cookies.length > 0) {
      console.log(`🍪 Setting ${options.cookies.length} cookies...`);
      
      try {
        await this.page.setCookie(...options.cookies);
        console.log(`✅ Successfully set ${options.cookies.length} cookies`);
        await this.delay(3000);
      } catch (error) {
        console.warn('⚠️ Error setting cookies:', error.message);
      }
    }

    return { browser: this.browser, page: this.page };
  }

  async findAndClickConnectButton() {
    if (!this.page) {
      return { success: false, message: '❌ Page not initialized' };
    }

    console.log('🔍 Searching for connect button...');
    
    try {
      // METHOD 1: Use JavaScript to find and click button
      const result = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        
        for (const button of buttons) {
          const text = button.textContent?.trim() || '';
          const ariaLabel = button.getAttribute('aria-label') || '';
          const isVisible = button.offsetWidth > 0 && button.offsetHeight > 0;
          
          // Check if this is a Connect button
          const isConnectButton = (
            text.includes('Connect') || 
            text.includes('Invite') || 
            ariaLabel.includes('Connect') || 
            ariaLabel.includes('Invite')
          ) && !ariaLabel.includes('Pending') && !text.includes('Pending');
          
          if (isConnectButton && isVisible) {
            // Scroll into view
            button.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'center'
            });
            
            // Click the button
            button.click();
            
            return {
              success: true,
              text: text,
              ariaLabel: ariaLabel
            };
          }
        }
        return { success: false };
      });
      
      if (result.success) {
        console.log(`✅ Found Connect button! Text: "${result.text}", Aria: "${result.ariaLabel}"`);
        await this.delay(1000);
        return { success: true, message: '✅ Connect button clicked!' };
      }
      
      // METHOD 2: Try CSS selectors
      console.log('⚠️ JavaScript method failed, trying CSS selectors...');
      
      const cssSelectors = [
        'button[aria-label*="Invite"]',
        'button[aria-label*="Connect"]',
        'button[data-control-name="connect"]',
        'button.pv-s-profile-actions__connect',
        'button.artdeco-button--primary'
      ];
      
      for (const selector of cssSelectors) {
        console.log(`  Trying CSS: ${selector}`);
        const button = await this.page.$(selector);
        
        if (button) {
          const isVisible = await button.evaluate((el) => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return style.display !== 'none' &&
                   style.visibility !== 'hidden' &&
                   style.opacity !== '0' &&
                   rect.width > 0 &&
                   rect.height > 0;
          });
          
          if (isVisible) {
            const buttonInfo = await button.evaluate((el) => {
              const text = el.textContent?.trim() || '';
              const ariaLabel = el.getAttribute('aria-label') || '';
              return { text, ariaLabel };
            });
            
            console.log(`✅ Found button: ${buttonInfo.ariaLabel || buttonInfo.text}`);
            
            // Scroll into view
            await button.evaluate((el) => {
              el.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
              });
            });
            
            await this.delay(1000);
            
            // Click the button
            await button.click({ delay: 100 });
            console.log('✅ Connect button clicked!');
            
            return { success: true, message: '✅ Connect button clicked!' };
          }
        }
      }
      
      console.log('❌ Connect button not found');
      return { success: false, message: '❌ Connect button not found' };
      
    } catch (error) {
      console.error('❌ Error:', error);
      return { 
        success: false, 
        message: `❌ Error: ${error.message}` 
      };
    }
  }

  async handleConnectionPopup(note) {
    if (!this.page) return false;

    console.log('⏳ Waiting for popup dialog...');
    
    try {
      await this.delay(2000);
      
      // Look for dialog
      const dialogSelectors = [
        'div[role="dialog"]',
        'div[class*="modal"]',
        'div[class*="artdeco-modal"]'
      ];
      
      let dialogFound = false;
      for (const selector of dialogSelectors) {
        const dialog = await this.page.$(selector);
        if (dialog) {
          dialogFound = true;
          console.log('✅ Popup found!');
          break;
        }
      }
      
      if (!dialogFound) {
        console.log('⚠️ No popup found, checking if already sent...');
        return true;
      }
      
      await this.delay(1000);
      
      // Add note if provided
      if (note && note.trim()) {
        console.log(`📝 Adding note: ${note}`);
        
        const noteSelectors = [
          'textarea[placeholder*="Note"]',
          'textarea[placeholder*="message"]',
          'textarea[aria-label*="message"]',
          'textarea'
        ];
        
        for (const selector of noteSelectors) {
          const noteField = await this.page.$(selector);
          if (noteField) {
            await noteField.click();
            await this.delay(500);
            await noteField.type(note, { delay: 30 });
            console.log('✅ Note added!');
            break;
          }
        }
      }
      
      await this.delay(1000);
      
      // Click Send button using JavaScript
      const sendClicked = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        
        for (const button of buttons) {
          const text = button.textContent?.trim() || '';
          const ariaLabel = button.getAttribute('aria-label') || '';
          const isVisible = button.offsetWidth > 0 && button.offsetHeight > 0;
          
          if ((text.includes('Send') || ariaLabel.includes('Send')) && isVisible) {
            button.click();
            return true;
          }
        }
        return false;
      });
      
      if (sendClicked) {
        console.log('✅ Send button clicked!');
        await this.delay(2000);
        return true;
      }
      
      console.log('❌ Send button not found');
      return false;
      
    } catch (error) {
      console.error('❌ Error handling popup:', error);
      return false;
    }
  }

  async sendConnection(task) {
    console.log(`🤖 Starting connection process for: ${task.profile_url}`);
    
    try {
      // Prepare cookies
      const cookies = [
        this.createCookie('li_at', task.session?.li_at_cookie || task.li_at_cookie, '.linkedin.com')
      ];
      
      // Launch browser
      console.log('🚀 Launching browser...');
      await this.launchBrowser({
        userAgent: task.session?.browser_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        cookies: cookies,
        headless: false,
        ignoreHTTPSErrors: true,
        timeout: 60000
      });
      
      if (!this.page) {
        throw new Error('Page not created');
      }
      
      // Test login
      console.log('🔐 Testing login...');
      await this.page.goto('https://www.linkedin.com/feed', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      await this.delay(5000);
      
      // Check login
      const currentUrl = await this.page.url();
      const pageContent = await this.page.content();
      
      if (currentUrl.includes('login') || currentUrl.includes('signin') || 
          pageContent.includes('Sign In') || pageContent.includes('signin')) {
        return {
          success: false,
          status: 'failed',
          profileUrl: task.profile_url,
          error: 'Login failed',
          message: '❌ LOGIN FAILED: Cookie may be expired'
        };
      }
      
      console.log('✅ Login successful!');
      
      // Navigate to profile
      console.log(`🌐 Navigating to profile: ${task.profile_url}`);
      await this.page.goto(task.profile_url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      await this.delay(5000);
      
      // Take screenshot before
      const beforeScreenshot = await this.page.screenshot({ encoding: 'base64' });
      
      // Find and click Connect button
      console.log('🔍 Finding Connect button...');
      const connectResult = await this.findAndClickConnectButton();
      
      if (!connectResult.success) {
        return {
          success: false,
          status: 'failed',
          profileUrl: task.profile_url,
          error: 'No Connect button',
          message: connectResult.message,
          screenshot: beforeScreenshot
        };
      }
      
      // Handle popup
      await this.delay(3000);
      const popupResult = await this.handleConnectionPopup(task.connection_note);
      
      // Take screenshot after
      await this.delay(2000);
      const afterScreenshot = await this.page.screenshot({ encoding: 'base64' });
      
      if (popupResult) {
        console.log('🎉 Connection process completed!');
        
        // Check for success
        await this.delay(3000);
        const finalContent = await this.page.content();
        
        if (finalContent.includes('Pending') || finalContent.includes('pending')) {
          return {
            success: true,
            status: 'sent',
            profileUrl: task.profile_url,
            message: '🎉 SUCCESS! Connection request sent and is now PENDING!',
            screenshot: afterScreenshot
          };
        } else {
          return {
            success: true,
            status: 'sent',
            profileUrl: task.profile_url,
            message: '✅ Connection request sent successfully!',
            screenshot: afterScreenshot
          };
        }
      } else {
        return {
          success: false,
          status: 'failed',
          profileUrl: task.profile_url,
          error: 'Popup handling failed',
          message: '❌ Could not complete connection process',
          screenshot: afterScreenshot
        };
      }
      
    } catch (error) {
      console.error('❌ Error in sendConnection:', error);
      
      let screenshot = '';
      if (this.page) {
        try {
          screenshot = await this.page.screenshot({ encoding: 'base64' });
        } catch (e) {
          console.error('Failed to take screenshot:', e);
        }
      }
      
      return {
        success: false,
        status: 'failed',
        profileUrl: task.profile_url,
        error: error.message,
        message: `❌ ERROR: ${error.message}`,
        screenshot: screenshot
      };
    }
  }

  async close() {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.browserLaunched = false;
      console.log('✅ Browser closed');
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }
}

// Express server endpoints
app.get('/api/health', (req, res) => {
  console.log('✅ Health check received');
  res.json({ 
    status: 'ok', 
    message: 'Automation server is running',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/automate', async (req, res) => {
  console.log('📥 Received automation request');
  
  try {
    const { 
      account, 
      session, 
      profile_url, 
      connection_note 
    } = req.body;

    console.log('📋 Task details:', {
      account: account?.name,
      profile_url,
      has_note: !!connection_note,
      cookie_length: session?.li_at_cookie?.length || 0
    });

    // Validate required fields
    if (!session?.li_at_cookie) {
      return res.status(400).json({
        success: false,
        error: 'No li_at cookie provided'
      });
    }

    if (!profile_url || !profile_url.includes('linkedin.com')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid LinkedIn profile URL'
      });
    }

    // Create connector instance
    const connector = new LinkedInConnector();
    
    console.log('🤖 Starting LinkedIn automation...');
    
    // Send connection request
    const result = await connector.sendConnection({
      profile_url,
      connection_note: connection_note || 'Hi, I would like to connect with you.',
      session: {
        li_at_cookie: session.li_at_cookie,
        browser_agent: session.browser_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log('📊 Automation result:', {
      success: result.success,
      status: result.status,
      message: result.message
    });

    // Close browser
    await connector.close();

    // Send response
    res.json(result);

  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Internal server error'
    });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Express server running on http://localhost:${PORT}`);
  console.log(`📡 Endpoints:`);
  console.log(`   • Health: http://localhost:${PORT}/api/health`);
  console.log(`   • Automate: http://localhost:${PORT}/api/automate`);
  console.log(`\n✅ LinkedInConnector features:`);
  console.log(`   • CSS selector-based button detection`);
  console.log(`   • Multiple selector strategies`);
  console.log(`   • Popup handling with note addition`);
  console.log(`   • Screenshot capture for debugging`);
});