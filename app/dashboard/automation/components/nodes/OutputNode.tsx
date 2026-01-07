'use client'

import { Handle, Position } from 'reactflow'
import { Save, Database, Bell, Mail, Link, FileText } from 'lucide-react'

interface OutputNodeProps {
  data: {
    label: string
    type: string
    config?: any
    status?: string
    lastRun?: string
  }
  selected?: boolean
}

export default function OutputNode({ data, selected }: OutputNodeProps) {
  const getIcon = () => {
    switch (data.type) {
      case 'save_db':
        return <Database className="h-4 w-4 text-red-500" />
      case 'notification':
        return <Bell className="h-4 w-4 text-yellow-500" />
      case 'email':
        return <Mail className="h-4 w-4 text-blue-500" />
      case 'webhook_out':
        return <Link className="h-4 w-4 text-green-500" />
      case 'log':
        return <FileText className="h-4 w-4 text-gray-500" />
      default:
        return <Save className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusColor = () => {
    switch (data.status) {
      case 'completed':
        return 'border-green-500 bg-green-50'
      case 'failed':
        return 'border-red-500 bg-red-50'
      default:
        return 'border-red-300 bg-red-50'
    }
  }

  return (
    <div className={`px-4 py-3 rounded-lg border-2 ${getStatusColor()} ${selected ? 'ring-2 ring-red-300 ring-offset-1' : ''} shadow-sm min-w-[200px]`}>
      <div className="flex items-start gap-3">
        <div className="mt-1 flex-shrink-0">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{data.label}</div>
          {data.config && (
            <div className="text-xs text-gray-600 mt-1">
              {data.type === 'save_db' && 'Save results to database'}
              {data.type === 'notification' && 'Send notification'}
              {data.type === 'email' && 'Send email report'}
              {data.type === 'webhook_out' && 'Send webhook'}
              {data.type === 'log' && 'Log execution results'}
            </div>
          )}
          {data.lastRun && (
            <div className="text-xs text-gray-500 mt-1">
              Last: {new Date(data.lastRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          <div className="text-xs text-red-600 font-medium mt-2">
            ⚡ OUTPUT
          </div>
        </div>
      </div>
      
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 !bg-gray-400 !border-2 !border-white"
      />
    </div>
  )
}