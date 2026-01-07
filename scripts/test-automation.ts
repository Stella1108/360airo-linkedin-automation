// scripts/test-automation.ts
import { LinkedInConnector } from '../lib/puppeteer-connector'

async function testAutomation() {
  console.log('🧪 Testing LinkedIn Automation...')
  
  const connector = new LinkedInConnector()
  
  // Test task - REPLACE WITH YOUR ACTUAL VALUES
  const testTask = {
    id: 999,
    li_at_cookie: process.env.LI_AT_COOKIE || 'your_li_at_cookie_here',
    profile_url: 'https://www.linkedin.com/in/example-profile',
    connection_note: 'Hi, I would like to connect with you!',
    account_id: 1
  }
  
  try {
    console.log('Starting test...')
    const result = await connector.sendConnection(testTask)
    console.log('✅ Test completed!')
    console.log('Result:', JSON.stringify(result, null, 2))
    
    if (result.success) {
      console.log('🎉 Success! Connection request was sent.')
    } else {
      console.log('❌ Failed:', result.message)
      if (result.screenshot) {
        console.log('📸 Screenshot saved:', result.screenshot)
      }
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
    console.error(error.stack)
  } finally {
    await connector.close()
    console.log('Test finished.')
  }
}

// Run test
if (require.main === module) {
  testAutomation().catch(console.error)
}

export { testAutomation }