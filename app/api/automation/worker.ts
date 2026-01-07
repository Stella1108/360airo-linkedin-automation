// app/api/automation/worker.ts
import { supabaseAdmin } from '@/lib/supabase'

// Type Definitions
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

interface WorkerResult {
  success: boolean
  message?: string
  taskId?: number
  profileUrl?: string
  error?: string
}

interface WorkerConfig {
  checkInterval: number // milliseconds
  minDelayMinutes: number
  maxDelayMinutes: number
  noTaskDelay: number // milliseconds
  errorDelay: number // milliseconds
}

// Configuration
const config: WorkerConfig = {
  checkInterval: 10000, // Check every 10 seconds
  minDelayMinutes: 30,
  maxDelayMinutes: 45,
  noTaskDelay: 60000, // 1 minute if no tasks
  errorDelay: 60000 // 1 minute on error
}

// Helper function to add delay
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Generate random delay between min and max minutes
const getRandomDelay = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Process the next pending task
async function processNextTask(): Promise<WorkerResult | null> {
  try {
    console.log('🔍 Checking for pending tasks...')
    
    // Get the oldest pending task that's scheduled to run
    const { data: tasks, error } = await supabaseAdmin
      .from('automation_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('scheduled_time', new Date().toISOString())
      .order('scheduled_time', { ascending: true })
      .limit(1)

    if (error) {
      console.error('Database error:', error.message)
      return null
    }

    if (!tasks || tasks.length === 0) {
      console.log('No pending tasks found.')
      return null
    }

    const task: AutomationTask = tasks[0]
    console.log(`🎯 Found task #${task.id} for ${task.profile_url}`)

    // Update task status to processing before calling API
    await supabaseAdmin
      .from('automation_queue')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', task.id)

    // Call our API endpoint to process this task
    const response = await fetch('http://localhost:3000/api/automation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId: task.id })
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const result: WorkerResult = await response.json()
    
    console.log(`Task #${task.id} processed:`, result.success ? '✅ Success' : '❌ Failed')
    
    // Log additional details if available
    if (result.message) {
      console.log(`   Message: ${result.message}`)
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }

    return result

  } catch (error) {
    console.error('Worker error:', error instanceof Error ? error.message : 'Unknown error')
    
    // Attempt to log the error to the database
    try {
      await supabaseAdmin
        .from('automation_logs')
        .insert({
          action: 'worker_error',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown worker error',
          details: { error },
          created_at: new Date().toISOString()
        })
    } catch (logError) {
      console.error('Failed to log worker error:', logError)
    }
    
    return null
  }
}

// Alternative: Task queue processor for bulk processing
export async function processTaskQueue(maxTasks: number = 3): Promise<void> {
  console.log(`🚀 Processing up to ${maxTasks} tasks from queue...`)
  
  const tasks: WorkerResult[] = []
  
  for (let i = 0; i < maxTasks; i++) {
    const result = await processNextTask()
    
    if (result) {
      tasks.push(result)
      
      if (result.success) {
        // Add delay between tasks
        const delayMinutes = getRandomDelay(config.minDelayMinutes, config.maxDelayMinutes)
        console.log(`⏳ Processed ${i + 1}/${maxTasks}, waiting ${delayMinutes} minutes...`)
        
        if (i < maxTasks - 1) { // Don't delay after the last task
          await delay(delayMinutes * 60 * 1000)
        }
      }
    } else {
      break // No more tasks
    }
  }
  
  console.log(`📊 Queue processing complete. Processed ${tasks.length} tasks.`)
  
  const successfulTasks = tasks.filter(t => t.success).length
  console.log(`   Successful: ${successfulTasks}/${tasks.length}`)
}

// Main worker loop
async function startWorker(): Promise<void> {
  console.log('🚀 Starting LinkedIn automation worker...')
  console.log('==========================================')
  console.log(`Configuration:`)
  console.log(`  Check interval: ${config.checkInterval / 1000} seconds`)
  console.log(`  Task delay: ${config.minDelayMinutes}-${config.maxDelayMinutes} minutes`)
  console.log(`  No task delay: ${config.noTaskDelay / 1000} seconds`)
  console.log(`  Error delay: ${config.errorDelay / 1000} seconds`)
  console.log('==========================================')

  let isRunning = true
  let taskCount = 0
  let successCount = 0
  let errorCount = 0

  // Handle graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n📊 Received ${signal}. Shutting down gracefully...`)
    console.log(`📊 Worker Statistics:`)
    console.log(`   Total tasks processed: ${taskCount}`)
    console.log(`   Successful: ${successCount}`)
    console.log(`   Failed: ${errorCount}`)
    console.log(`   Success rate: ${taskCount > 0 ? Math.round((successCount / taskCount) * 100) : 0}%`)
    
    isRunning = false
    
    // Give a moment for any ongoing tasks to complete
    await delay(2000)
    console.log('🛑 Worker stopped')
    process.exit(0)
  }

  // Set up signal handlers
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  // Main worker loop
  while (isRunning) {
    try {
      const result = await processNextTask()
      
      if (result) {
        taskCount++
        
        if (result.success) {
          successCount++
          
          // Add random delay between successful tasks
          const delayMinutes = getRandomDelay(config.minDelayMinutes, config.maxDelayMinutes)
          console.log(`⏳ Waiting ${delayMinutes} minutes before next task...`)
          
          // Convert minutes to milliseconds and subtract the time already spent
          const delayMs = (delayMinutes * 60 * 1000) - config.checkInterval
          
          if (delayMs > 0) {
            await delay(delayMs)
          }
        } else {
          errorCount++
          
          // Shorter delay on failure (5-10 minutes)
          const retryDelayMinutes = getRandomDelay(5, 10)
          console.log(`⚠️ Task failed, retrying in ${retryDelayMinutes} minutes...`)
          await delay(retryDelayMinutes * 60 * 1000)
        }
      } else {
        // No tasks found, wait a bit before checking again
        console.log(`⏳ No tasks, checking again in ${config.noTaskDelay / 1000} seconds...`)
        await delay(config.noTaskDelay)
      }
      
    } catch (error) {
      errorCount++
      console.error('Worker loop error:', error instanceof Error ? error.message : 'Unknown error')
      
      // Wait on error before retrying
      console.log(`⚠️ Error encountered, retrying in ${config.errorDelay / 1000} seconds...`)
      await delay(config.errorDelay)
    }
  }
}

// Start the worker if this file is run directly
if (require.main === module) {
  startWorker().catch(error => {
    console.error('Failed to start worker:', error)
    process.exit(1)
  })
}

// Export for use in other files
export { 
  startWorker, 
  processNextTask, 
  delay,
  getRandomDelay 
}

// Export types
export type { 
  AutomationTask, 
  WorkerResult, 
  WorkerConfig 
}