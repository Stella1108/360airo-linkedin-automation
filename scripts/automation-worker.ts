// scripts/automation-worker.ts
import { AutomationService } from '../lib/automation-service'

async function startWorker() {
  console.log('🚀 Starting LinkedIn Automation Worker...')
  
  const service = new AutomationService()
  
  // Process tasks every 5 minutes
  const interval = 5 * 60 * 1000
  
  const processTasks = async () => {
    try {
      console.log('⏰ Checking for tasks...')
      const result = await service.processNextTask()
      
      if (result) {
        console.log(`✅ Task processed: ${result.message}`)
      } else {
        console.log('ℹ️ No tasks to process')
      }
    } catch (error: any) {
      console.error('❌ Worker error:', error.message)
    }
  }
  
  // Run immediately, then every interval
  await processTasks()
  const intervalId = setInterval(processTasks, interval)
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('🛑 Stopping worker...')
    clearInterval(intervalId)
    await service.close()
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    console.log('🛑 Terminating worker...')
    clearInterval(intervalId)
    await service.close()
    process.exit(0)
  })
}

// Start the worker
if (require.main === module) {
  startWorker().catch(console.error)
}

export { startWorker }