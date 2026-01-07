// app/automation/components/nodes/ActionNode.tsx
'use client'

import { Handle, Position } from 'reactflow'
import { Linkedin, Send, MessageSquare, Eye, ThumbsUp, Database, UserPlus, Trash2, Play } from 'lucide-react'
import { useState } from 'react'

interface ActionNodeProps {
  data: {
    label: string
    type: string
    config?: any
    status?: string
    lastRun?: string
    error?: string
  }
  selected?: boolean
  id: string
  onDelete?: (id: string) => void
  onExecute?: (id: string) => void
}

export default function ActionNode({ data, selected, id, onDelete, onExecute }: ActionNodeProps) {
  const [isHovered, setIsHovered] = useState(false)

  const getIcon = () => {
    switch (data.type) {
      case 'send_connection':
        return <UserPlus className="h-4 w-4 text-green-500" />
      case 'send_message':
        return <MessageSquare className="h-4 w-4 text-blue-500" />
      case 'visit_profile':
        return <Eye className="h-4 w-4 text-purple-500" />
      case 'like_post':
        return <ThumbsUp className="h-4 w-4 text-yellow-500" />
      case 'extract_data':
        return <Database className="h-4 w-4 text-gray-500" />
      case 'scrape_profile':
        return <Linkedin className="h-4 w-4 text-orange-500" />
      default:
        return <Send className="h-4 w-4 text-gray-500" />
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
      case 'pending':
        return 'border-yellow-500 bg-yellow-50'
      default:
        return 'border-green-300 bg-white'
    }
  }

  const getStatusText = () => {
    if (data.error) return `Error: ${data.error.substring(0, 30)}...`
    if (data.lastRun) return `Last run: ${new Date(data.lastRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    return 'Ready'
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) onDelete(id)
  }

  const handleExecute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onExecute) onExecute(id)
  }

  return (
    <div 
      className={`px-4 py-3 rounded-lg border-2 ${getStatusColor()} ${selected ? 'ring-2 ring-green-300 ring-offset-1' : ''} shadow-sm min-w-[200px] relative group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Action buttons on hover */}
      {isHovered && (
        <div className="absolute -top-2 -right-2 flex gap-1 z-10">
          {onExecute && (
            <button
              onClick={handleExecute}
              className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-sm"
              title="Execute node"
            >
              <Play className="h-3 w-3" />
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
          {data.config && (
            <div className="text-xs text-gray-600 mt-1 truncate">
              {data.type === 'send_connection' && `Send ${data.config.limitPerDay || 3} requests/day`}
              {data.type === 'delay' && `Delay: ${data.config.duration || 30} ${data.config.unit || 'minutes'}`}
              {data.type === 'filter' && `Filter by ${data.config.field || 'company'}`}
              {data.type === 'extract_data' && `Extract from ${data.config.source || 'profiles'}`}
            </div>
          )}
          <div className="text-xs text-gray-500 mt-1 truncate">
            {getStatusText()}
          </div>
          <div className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1">
            <Linkedin className="h-3 w-3" />
            LINKEDIN ACTION
          </div>
        </div>
        {data.status === 'running' && (
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0"></div>
        )}
        {data.status === 'failed' && (
          <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0"></div>
        )}
      </div>
      
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 !bg-gray-400 !border-2 !border-white hover:!bg-blue-500 transition-colors"
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 !bg-gray-400 !border-2 !border-white hover:!bg-green-500 transition-colors"
      />
    </div>
  )
}