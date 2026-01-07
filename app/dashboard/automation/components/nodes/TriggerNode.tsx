// app/automation/components/nodes/TriggerNode.tsx
'use client'

import { Handle, Position } from 'reactflow'
import { Calendar, Zap, Globe, Play, Clock, Linkedin, Trash2, Settings } from 'lucide-react'
import { useState } from 'react'

interface TriggerNodeProps {
  data: {
    label: string
    type: string
    config?: any
    status?: string
    lastRun?: string
  }
  selected?: boolean
  id: string
  onDelete?: (id: string) => void
  onConfigure?: (id: string) => void
}

export default function TriggerNode({ data, selected, id, onDelete, onConfigure }: TriggerNodeProps) {
  const [isHovered, setIsHovered] = useState(false)

  const getIcon = () => {
    switch (data.type) {
      case 'schedule':
        return <Calendar className="h-4 w-4 text-blue-500" />
      case 'webhook':
        return <Globe className="h-4 w-4 text-green-500" />
      case 'manual':
        return <Play className="h-4 w-4 text-purple-500" />
      case 'interval':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'linkedin_account':
        return <Linkedin className="h-4 w-4 text-blue-600" />
      default:
        return <Zap className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    switch (data.status) {
      case 'running':
        return 'border-blue-500 bg-blue-50'
      case 'completed':
        return 'border-green-500 bg-green-50'
      case 'failed':
        return 'border-red-500 bg-red-50'
      default:
        return data.type === 'linkedin_account' ? 'border-blue-300 bg-blue-50' : 'border-blue-300 bg-blue-50'
    }
  }

  const getConfigInfo = () => {
    if (data.type === 'linkedin_account') {
      return data.config?.name ? `Account: ${data.config.name}` : 'LinkedIn Account'
    }
    
    if (!data.config) return ''
    
    switch (data.type) {
      case 'schedule':
        return data.config.scheduleType === 'daily' 
          ? `Daily at ${data.config.time || '09:00'}`
          : data.config.scheduleType === 'weekly'
          ? `Weekly on selected days`
          : `Cron: ${data.config.cronExpression || '0 9 * * *'}`
      case 'webhook':
        return 'Webhook endpoint'
      case 'manual':
        return 'Manual trigger'
      case 'interval':
        return `Every ${data.config.interval || 30} minutes`
      default:
        return ''
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) onDelete(id)
  }

  const handleConfigure = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onConfigure) onConfigure(id)
  }

  return (
    <div 
      className={`px-4 py-3 rounded-lg border-2 ${getStatusColor()} ${selected ? 'ring-2 ring-blue-300 ring-offset-1' : ''} shadow-sm min-w-[200px] relative group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Action buttons on hover */}
      {isHovered && (
        <div className="absolute -top-2 -right-2 flex gap-1 z-10">
          {onConfigure && (
            <button
              onClick={handleConfigure}
              className="p-1 bg-gray-500 text-white rounded-full hover:bg-gray-600 shadow-sm"
              title="Configure node"
            >
              <Settings className="h-3 w-3" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"
              title="Delete node"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="mt-1 flex-shrink-0">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{data.label}</div>
          {getConfigInfo() && (
            <div className="text-xs text-gray-600 mt-1 truncate">
              {getConfigInfo()}
            </div>
          )}
          {data.lastRun && (
            <div className="text-xs text-gray-500 mt-1">
              Last: {new Date(data.lastRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          <div className="text-xs text-blue-600 font-medium mt-2 flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {data.type === 'linkedin_account' ? 'LINKEDIN TRIGGER' : 'TRIGGER'}
          </div>
        </div>
        {data.status === 'running' && (
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0"></div>
        )}
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 !bg-blue-500 !border-2 !border-white hover:!bg-blue-600 transition-colors"
      />
    </div>
  )
}