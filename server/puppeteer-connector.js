// // server/puppeteer-connector.js (CommonJS version)
// const puppeteer = require('puppeteer')

// class LinkedInConnector {
//   constructor() {
//     this.browser = null
//     this.page = null
//   }

//   async delay(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms))
//   }

//   async launchBrowser(options = {}) {
//     console.log('🚀 Launching browser...')
    
//     const launchOptions = {
//       headless: options.headless !== false,
//       args: [
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         '--window-size=1366,768',
//         '--disable-notifications',
//         '--disable-dev-shm-usage'
//       ],
//       defaultViewport: options.viewport || { width: 1366, height: 768 }
//     }

//     this.browser = await puppeteer.launch(launchOptions)
//     this.page = await this.browser.newPage()
    
//     // Set user agent
//     await this.page.setUserAgent(
//       options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
//     )

//     // Set cookies if provided
//     if (options.cookies && options.cookies.length > 0) {
//       console.log(`🍪 Setting cookies...`)
//       try {
//         await this.page.setCookie(...options.cookies)
//         console.log('✅ Cookies set successfully')
//       } catch (error) {
//         console.warn('⚠️ Error setting cookies:', error.message)
//       }
//     }

//     await this.delay(2000)

//     return { browser: this.browser, page: this.page }
//   }

//   async sendConnectionRequest(task) {
//     console.log(`🤖 Starting connection process for: ${task.profile_url}`)
    
//     try {
//       // Prepare cookies
//       const cookies = [{
//         name: 'li_at',
//         value: task.session.li_at_cookie,
//         domain: '.linkedin.com'
//       }]
      
//       // Launch browser
//       const { page } = await this.launchBrowser({
//         cookies: cookies,
//         headless: false
//       })
      
//       console.log('🔐 Testing login...')
//       await page.goto('https://www.linkedin.com/feed', {
//         waitUntil: 'domcontentloaded',
//         timeout: 60000
//       })
      
//       await this.delay(3000)
      
//       // Check login
//       const currentUrl = await page.url()
//       if (currentUrl.includes('login') || currentUrl.includes('signin')) {
//         throw new Error('Login failed - LinkedIn cookie may be expired')
//       }
      
//       console.log('✅ Login successful!')
      
//       // Navigate to profile
//       console.log(`🌐 Navigating to profile: ${task.profile_url}`)
//       await page.goto(task.profile_url, {
//         waitUntil: 'domcontentloaded',
//         timeout: 60000
//       })
      
//       await this.delay(3000)
      
//       // Find and click Connect button
//       console.log('🔍 Looking for Connect button...')
      
//       const found = await page.evaluate(() => {
//         const buttons = Array.from(document.querySelectorAll('button'))
        
//         for (const button of buttons) {
//           const text = button.textContent?.trim() || ''
//           const aria = button.getAttribute('aria-label') || ''
          
//           // Check if this is a Connect button
//           if ((text.includes('Connect') || text.includes('Invite') || 
//                aria.includes('Connect') || aria.includes('Invite')) &&
//               button.offsetWidth > 0 && button.offsetHeight > 0) {
            
//             // Scroll into view
//             button.scrollIntoView({ 
//               behavior: 'smooth', 
//               block: 'center',
//               inline: 'center'
//             })
            
//             // Click it
//             button.click()
//             return true
//           }
//         }
//         return false
//       })
      
//       if (!found) {
//         throw new Error('Connect button not found')
//       }
      
//       console.log('✅ Connect button clicked!')
//       await this.delay(3000)
      
//       // Handle connection popup
//       console.log('⏳ Handling connection popup...')
      
//       // Add note if provided
//       if (task.connection_note && task.connection_note.trim()) {
//         console.log(`📝 Adding note...`)
        
//         const noteAdded = await page.evaluate((note) => {
//           const textareas = Array.from(document.querySelectorAll('textarea'))
          
//           for (const textarea of textareas) {
//             const placeholder = textarea.getAttribute('placeholder') || ''
//             const ariaLabel = textarea.getAttribute('aria-label') || ''
            
//             if (placeholder.includes('Note') || placeholder.includes('message') || 
//                 ariaLabel.includes('message')) {
              
//               textarea.focus()
//               textarea.value = note
//               return true
//             }
//           }
//           return false
//         }, task.connection_note)
        
//         if (noteAdded) {
//           console.log('✅ Note added!')
//         }
//       }
      
//       // Click Send button
//       const sent = await page.evaluate(() => {
//         const buttons = Array.from(document.querySelectorAll('button'))
        
//         for (const button of buttons) {
//           const text = button.textContent?.trim() || ''
//           const aria = button.getAttribute('aria-label') || ''
          
//           if ((text.includes('Send') || text.includes('Send invitation') || aria.includes('Send')) &&
//               button.offsetWidth > 0 && button.offsetHeight > 0) {
            
//             button.click()
//             return true
//           }
//         }
//         return false
//       })
      
//       if (sent) {
//         console.log('✅ Send button clicked!')
//       }
      
//       await this.delay(3000)
      
//       // Check if connection was sent
//       const pageContent = await page.content()
//       const success = pageContent.includes('Pending') || 
//                      pageContent.includes('pending') || 
//                      pageContent.includes('Invitation sent') ||
//                      pageContent.includes('Request sent')
      
//       // Close browser
//       await this.close()
      
//       return {
//         success: true,
//         status: 'sent',
//         profileUrl: task.profile_url,
//         message: success ? 'Connection request sent successfully!' : 'Action completed (may need manual verification)'
//       }
      
//     } catch (error) {
//       console.error('❌ Error:', error.message)
      
//       // Close browser on error
//       await this.close()
      
//       return {
//         success: false,
//         status: 'failed',
//         profileUrl: task.profile_url,
//         error: error.message,
//         message: `Error: ${error.message}`
//       }
//     }
//   }

//   async close() {
//     try {
//       if (this.page) {
//         await this.page.close()
//         this.page = null
//       }
//       if (this.browser) {
//         await this.browser.close()
//         this.browser = null
//       }
//       console.log('✅ Browser closed')
//     } catch (error) {
//       console.error('Error closing browser:', error)
//     }
//   }
// }

// module.exports = { LinkedInConnector }