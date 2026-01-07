// lib/workflow-engine.ts

interface WorkflowNode {
  id: string
  type: string
  data: {
    type: string
    config: any
    label: string
  }
}

interface WorkflowEdge {
  id: string
  source: string
  target: string
  animated: boolean
}

interface ExecutionContext {
  data: any
  nodeId: string
  timestamp: string
}

interface ConnectionConfig {
  accountId: string
  message: string
  limitPerDay: number
  delayBetween: number
}

interface DelayConfig {
  duration: number
  unit: 'seconds' | 'minutes' | 'hours' | 'days'
}

interface FilterConfig {
  field: string
  operator: string
  value: string | number
}

interface ExtractDataConfig {
  source: string
  fields: string[]
  limit: number
}

interface LogConfig {
  message: string
  level: 'info' | 'warn' | 'error'
}

interface WebhookConfig {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: any
}

interface SendMessageConfig {
  accountId: string
  message: string
  recipients: string[]
  delayBetween: number
}

interface Profile {
  name: string
  linkedin_url: string
  [key: string]: any
}

interface ConnectionResult {
  profile: string
  success: boolean
  timestamp?: string
  error?: string
}

interface ExecutionLogEntry {
  nodeId: string
  status: 'success' | 'failed' | 'skipped'
  input: any
  output: any
  error?: string
  timestamp: string
}

export class WorkflowEngine {
  private nodes: Map<string, WorkflowNode>
  private edges: WorkflowEdge[]
  private executionLog: ExecutionLogEntry[]

  constructor(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    this.nodes = new Map(nodes.map(node => [node.id, node]))
    this.edges = edges
    this.executionLog = []
  }

  async execute(initialData: any = {}): Promise<{
    success: boolean
    executionLog: ExecutionLogEntry[]
    finalData: any
    nodeCount: number
    executedNodes: number
  }> {
    console.log('Starting workflow execution...')
    
    // Find start node (trigger node with no incoming edges)
    const startNode = this.findStartNode()
    if (!startNode) {
      throw new Error('No start node found in workflow')
    }

    // Initialize execution context
    const context: ExecutionContext = {
      data: initialData,
      nodeId: startNode.id,
      timestamp: new Date().toISOString()
    }

    // Execute workflow
    await this.executeNode(context)

    return {
      success: true,
      executionLog: this.executionLog,
      finalData: context.data,
      nodeCount: this.nodes.size,
      executedNodes: this.executionLog.length
    }
  }

  private async executeNode(context: ExecutionContext): Promise<void> {
    const node = this.nodes.get(context.nodeId)
    if (!node) {
      this.logExecution(context.nodeId, 'failed', context.data, null, 'Node not found')
      return
    }

    console.log(`Executing node: ${node.data.label} (${node.data.type})`)

    try {
      let outputData = { ...context.data }

      // Execute based on node type
      switch (node.data.type) {
        case 'schedule':
          // Trigger node, just pass through
          break

        case 'send_connection':
          outputData = await this.executeSendConnection(node.data.config, context.data)
          break

        case 'send_message':
          outputData = await this.executeSendMessage(node.data.config, context.data)
          break

        case 'delay':
          outputData = await this.executeDelay(node.data.config, context.data)
          break

        case 'filter':
          outputData = await this.executeFilter(node.data.config, context.data)
          break

        case 'extract_data':
          outputData = await this.executeExtractData(node.data.config, context.data)
          break

        case 'webhook':
          outputData = await this.executeWebhook(node.data.config, context.data)
          break

        case 'log':
          outputData = await this.executeLog(node.data.config, context.data)
          break

        default:
          console.warn(`Unknown node type: ${node.data.type}`)
      }

      // Log successful execution
      this.logExecution(node.id, 'success', context.data, outputData)

      // Find next nodes to execute
      const nextEdges = this.edges.filter(edge => edge.source === node.id)
      
      for (const edge of nextEdges) {
        // Check if this connection has a condition
        if (edge.animated && !this.evaluateCondition(edge, outputData)) {
          console.log(`Skipping edge ${edge.id} due to condition`)
          continue
        }

        // Execute next node
        const nextContext: ExecutionContext = {
          data: outputData,
          nodeId: edge.target,
          timestamp: new Date().toISOString()
        }

        await this.executeNode(nextContext)
      }

    } catch (error: any) {
      console.error(`Error executing node ${node.id}:`, error)
      this.logExecution(node.id, 'failed', context.data, null, error.message)

      // Find error handler nodes
      const errorEdges = this.edges.filter(
        edge => edge.source === node.id && edge.animated
      )

      for (const edge of errorEdges) {
        const errorContext: ExecutionContext = {
          data: { ...context.data, error: error.message },
          nodeId: edge.target,
          timestamp: new Date().toISOString()
        }
        await this.executeNode(errorContext)
      }
    }
  }

  private async executeSendConnection(config: ConnectionConfig, inputData: any): Promise<any> {
    console.log('Executing send connection:', config)
    
    // Your LinkedIn connection logic here
    const { accountId, message, limitPerDay, delayBetween } = config
    
    // Fetch profiles from connection_sample table
    const profiles = await this.fetchProfilesFromDatabase(limitPerDay)
    
    const results: ConnectionResult[] = []
    for (const profile of profiles) {
      try {
        // Replace template variables
        const personalizedMessage = this.replaceTemplateVariables(message, profile)
        
        // Call LinkedIn API to send connection
        const result = await this.sendLinkedInConnection(accountId, profile.linkedin_url, personalizedMessage)
        
        results.push({
          profile: profile.name,
          success: true,
          timestamp: new Date().toISOString()
        })
        
        // Add delay between requests
        if (delayBetween && delayBetween > 0) {
          await this.delay(delayBetween * 60000) // Convert minutes to milliseconds
        }
        
      } catch (error) {
        results.push({
          profile: profile.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return {
      ...inputData,
      sentConnections: results,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length
    }
  }

  private async executeDelay(config: DelayConfig, inputData: any): Promise<any> {
    const { duration, unit = 'minutes' } = config
    
    const unitMap: Record<'seconds' | 'minutes' | 'hours' | 'days', number> = {
      seconds: 1000,
      minutes: 60000,
      hours: 3600000,
      days: 86400000
    }
    
    const milliseconds = unitMap[unit] || 60000
    
    console.log(`Delaying for ${duration} ${unit}...`)
    await this.delay(duration * milliseconds)
    
    return {
      ...inputData,
      delayCompleted: true,
      delayDuration: `${duration} ${unit}`,
      delayTimestamp: new Date().toISOString()
    }
  }

  private async executeFilter(config: FilterConfig, inputData: any): Promise<any> {
    const { field, operator, value } = config
    
    // Get data to filter (assuming inputData contains profiles array)
    const items = inputData.profiles || inputData.data || []
    
    const filteredItems = items.filter((item: any) => {
      const itemValue = item[field]
      
      if (itemValue === undefined || itemValue === null) return false
      
      const strValue = String(value).toLowerCase()
      const strItemValue = String(itemValue).toLowerCase()
      
      switch (operator) {
        case 'equals':
          return strItemValue === strValue
        case 'contains':
          return strItemValue.includes(strValue)
        case 'starts_with':
          return strItemValue.startsWith(strValue)
        case 'ends_with':
          return strItemValue.endsWith(strValue)
        case 'greater_than':
          return Number(itemValue) > Number(value)
        case 'less_than':
          return Number(itemValue) < Number(value)
        case 'in':
          const valueList = String(value).split(',').map(v => v.trim())
          return valueList.includes(String(itemValue).trim())
        case 'not_in':
          const valueList2 = String(value).split(',').map(v => v.trim())
          return !valueList2.includes(String(itemValue).trim())
        default:
          return true
      }
    })
    
    return {
      ...inputData,
      filteredData: filteredItems,
      originalCount: items.length,
      filteredCount: filteredItems.length,
      filterCriteria: { field, operator, value }
    }
  }

  private async executeExtractData(config: ExtractDataConfig, inputData: any): Promise<any> {
    const { source, fields, limit = 50 } = config
    
    let extractedData: any[] = []
    
    if (source === 'connection_sample') {
      // Fetch from your connection_sample table
      extractedData = await this.fetchFromConnectionSample(fields, limit)
    }
    
    return {
      ...inputData,
      extractedData,
      source,
      fieldCount: fields.length,
      recordCount: extractedData.length
    }
  }

  private async executeWebhook(config: WebhookConfig, inputData: any): Promise<any> {
    console.log('Executing webhook:', config.url)
    
    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        body: config.body ? JSON.stringify(config.body) : undefined
      })
      
      const data = await response.json()
      
      return {
        ...inputData,
        webhookResponse: data,
        webhookStatus: response.status,
        webhookSuccess: response.ok
      }
    } catch (error) {
      throw new Error(`Webhook failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async executeSendMessage(config: SendMessageConfig, inputData: any): Promise<any> {
    console.log('Executing send message:', config)
    
    const { accountId, message, recipients, delayBetween } = config
    
    const results: Array<{
      recipient: string
      success: boolean
      timestamp?: string
      error?: string
    }> = []
    
    for (const recipient of recipients) {
      try {
        // Call LinkedIn API to send message
        const result = await this.sendLinkedInMessage(accountId, recipient, message)
        
        results.push({
          recipient,
          success: true,
          timestamp: new Date().toISOString()
        })
        
        // Add delay between requests
        if (delayBetween && delayBetween > 0) {
          await this.delay(delayBetween * 60000)
        }
        
      } catch (error) {
        results.push({
          recipient,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return {
      ...inputData,
      sentMessages: results,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length
    }
  }

  private async executeLog(config: LogConfig, inputData: any): Promise<any> {
    const { message, level } = config
    
    // Replace template variables in message
    const processedMessage = this.replaceTemplateVariables(message, inputData)
    
    const logEntry = {
      level,
      message: processedMessage,
      timestamp: new Date().toISOString(),
      data: this.sanitizeData(inputData)
    }
    
    // Log to console based on level
    switch (level) {
      case 'info':
        console.info('📝 Workflow Log:', logEntry)
        break
      case 'warn':
        console.warn('⚠️ Workflow Warning:', logEntry)
        break
      case 'error':
        console.error('❌ Workflow Error:', logEntry)
        break
    }
    
    return {
      ...inputData,
      logEntry,
      logMessage: processedMessage
    }
  }

  private findStartNode(): WorkflowNode | undefined {
    // Find nodes with no incoming edges (trigger nodes)
    const nodeIdsWithIncomingEdges = new Set(
      this.edges.map(edge => edge.target)
    )
    
    return Array.from(this.nodes.values()).find(
      node => !nodeIdsWithIncomingEdges.has(node.id) && node.type === 'trigger'
    )
  }

  private logExecution(
    nodeId: string,
    status: 'success' | 'failed' | 'skipped',
    input: any,
    output: any,
    error?: string
  ): void {
    this.executionLog.push({
      nodeId,
      status,
      input: this.sanitizeData(input),
      output: this.sanitizeData(output),
      error,
      timestamp: new Date().toISOString()
    })
  }

  private sanitizeData(data: any): any {
    // Remove sensitive data before logging
    if (!data) return data
    
    if (typeof data !== 'object') return data
    
    const sanitized = { ...data }
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'cookie', 'access_token', 'refresh_token']
    
    for (const field of sensitiveFields) {
      if (sanitized[field] !== undefined) {
        sanitized[field] = '***REDACTED***'
      }
    }
    
    // Recursively sanitize nested objects
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key])
      }
    })
    
    return sanitized
  }

  private evaluateCondition(edge: WorkflowEdge, data: any): boolean {
    // Implement condition evaluation logic
    // For now, always return true
    return true
  }

  private replaceTemplateVariables(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match
    })
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Helper methods for database operations
  private async fetchProfilesFromDatabase(limit: number): Promise<Profile[]> {
    // Implement database fetch logic
    // Example: Fetch from your connection_sample table
    return []
  }

  private async fetchFromConnectionSample(fields: string[], limit: number): Promise<any[]> {
    // Implement database fetch logic
    return []
  }

  private async sendLinkedInConnection(accountId: string, profileUrl: string, message: string): Promise<any> {
    // Implement LinkedIn API call
    console.log(`Sending connection request to ${profileUrl} with message: ${message}`)
    return { success: true }
  }

  private async sendLinkedInMessage(accountId: string, recipientId: string, message: string): Promise<any> {
    // Implement LinkedIn message API call
    console.log(`Sending message to ${recipientId}: ${message}`)
    return { success: true }
  }
}