// test-automation.js 

const puppeteer = require('puppeteer')

async function finalTest() {
  console.log('🎯 FINAL TEST - CLICK BOTH CONNECT AND FOLLOW BUTTONS\n')
  
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  
  // Your cookie - UPDATE THIS!
  const LI_AT_COOKIE = 'AQEDAT7vYUwAl9gYAAABm7Jm31sAAAGb1nNjW1YAFMyioYXkCtVbBQLOQ4szcHXErYANK-Fava-l0TlMFBQmIdOkHRcORbQ1zyOw8LhsLk8UmKGRSODEOHv7uSjSdjdq_quM_4QoJRMdlNc2vXmrbArv'
  
  // Set cookie
  await page.setCookie({
    name: 'li_at',
    value: LI_AT_COOKIE,
    domain: '.linkedin.com'
  })
  
  console.log('🔐 Logging in...')
  await page.goto('https://www.linkedin.com/feed')
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  console.log('🌐 Going to test profile...')
  await page.goto('https://www.linkedin.com/in/shabarish-chinta-1a0b741aa/')
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  console.log('🔍 Looking for BOTH Connect AND Follow buttons...')
  
  let connectClicked = false
  let followClicked = false
  let messages = []
  
  // STEP 1: Look for CONNECT button
  console.log('🔍 Step 1: Looking for Connect button...')
  const connectResult = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button')
    
    for (const button of buttons) {
      const text = button.textContent?.trim() || ''
      const aria = button.getAttribute('aria-label') || ''
      const isVisible = button.offsetWidth > 0 && button.offsetHeight > 0
      
      // Check for Connect button
      const isConnectButton = (
        (text.includes('Connect') || text.includes('Invite') || 
         aria.includes('Connect') || aria.includes('Invite')) &&
        !aria.includes('Pending') && !text.includes('Pending') &&
        !text.includes('Message') && !aria.includes('Message')
      )
      
      if (isConnectButton && isVisible) {
        console.log('Found Connect button:', text, aria)
        
        // Scroll into view
        button.scrollIntoView({ behavior: 'smooth', block: 'center' })
        
        // Click it
        button.click()
        return { success: true, text: text }
      }
    }
    return { success: false }
  })
  
  if (connectResult.success) {
    console.log(`✅ Connect button clicked! Text: "${connectResult.text}"`)
    connectClicked = true
    messages.push('✅ Connect button clicked!')
    
    // Wait for popup and handle it
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Look for Send button in connection popup
    const sendResult = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button')
      
      for (const button of buttons) {
        const text = button.textContent?.trim() || ''
        const aria = button.getAttribute('aria-label') || ''
        
        if ((text.includes('Send') || aria.includes('Send')) &&
            button.offsetWidth > 0 && button.offsetHeight > 0) {
          
          console.log('Found Send button:', text)
          button.click()
          return { success: true }
        }
      }
      return { success: false }
    })
    
    if (sendResult.success) {
      console.log('✅ Connection request sent!')
      messages.push('Connection request sent!')
    }
  } else {
    console.log('⚠️ No Connect button found')
  }
  
  // Wait before looking for Follow button
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // STEP 2: Look for FOLLOW button (even if Connect was clicked)
  console.log('🔍 Step 2: Looking for Follow button...')
  const followResult = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button')
    
    for (const button of buttons) {
      const text = button.textContent?.trim() || ''
      const aria = button.getAttribute('aria-label') || ''
      const isVisible = button.offsetWidth > 0 && button.offsetHeight > 0
      
      // Check for Follow button (+Follow or Follow)
      const isFollowButton = (
        (text.includes('+Follow') || text.includes('Follow') || 
         aria.includes('Follow')) &&
        !aria.includes('Following') && !text.includes('Following') &&
        !aria.includes('Unfollow') && !text.includes('Unfollow') &&
        !text.includes('Message') && !aria.includes('Message')
      )
      
      if (isFollowButton && isVisible) {
        console.log('Found Follow button:', text, aria)
        
        // Scroll into view
        button.scrollIntoView({ behavior: 'smooth', block: 'center' })
        
        // Click it
        button.click()
        return { success: true, text: text }
      }
    }
    return { success: false }
  })
  
  if (followResult.success) {
    console.log(`✅ Follow button clicked! Text: "${followResult.text}"`)
    followClicked = true
    messages.push('✅ Follow button clicked!')
    
    // Check if follow was successful
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const isFollowing = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button')
      
      for (const button of buttons) {
        const text = button.textContent?.trim() || ''
        const aria = button.getAttribute('aria-label') || ''
        
        if ((text.includes('Following') || aria.includes('Following')) &&
            button.offsetWidth > 0) {
          return true
        }
      }
      return false
    })
    
    if (isFollowing) {
      console.log('✅ Successfully followed!')
      messages.push('Successfully followed!')
    } else {
      console.log('⚠️ Follow status uncertain')
    }
  } else {
    console.log('⚠️ No Follow button found')
  }
  
  // Report results
  console.log('\n📊 RESULTS:')
  if (connectClicked && followClicked) {
    console.log('✅ SUCCESS: Clicked BOTH Connect and Follow buttons!')
    console.log('📝 Actions:', messages.join(' '))
  } else if (connectClicked) {
    console.log('✅ SUCCESS: Clicked Connect button only')
    console.log('📝 Actions:', messages.join(' '))
  } else if (followClicked) {
    console.log('✅ SUCCESS: Clicked Follow button only')
    console.log('📝 Actions:', messages.join(' '))
  } else {
    console.log('❌ FAILED: No Connect or Follow buttons found')
  }
  
  // Wait and close
  await new Promise(resolve => setTimeout(resolve, 10000))
  await browser.close()
  console.log('✅ Test completed!')
}

finalTest().catch(console.error)  