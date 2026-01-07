'use client'

import { Handle, Position } from 'reactflow'
import { WorkflowNodeData } from '@/app/dashboard/automation/types'
import { Filter, GitBranch, GitMerge, AlertCircle, RefreshCw, Clock, Code, Split } from 'lucide-react'

interface ControlNodeProps {
  data: WorkflowNodeData
  selected?: boolean
}

const ControlNode = ({ data, selected }: ControlNodeProps) => {
  const getIcon = () => {
    switch (data.type) {
      case 'filter':
        return <Filter className="h-4 w-4 text-purple-500" />
      case 'delay':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'split':
        return <GitBranch className="h-4 w-4 text-blue-500" />
      case 'merge':
        return <GitMerge className="h-4 w-4 text-green-500" />
      case 'condition':
        return <Code className="h-4 w-4 text-orange-500" />
      case 'error_handler':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'loop':
        return <RefreshCw className="h-4 w-4 text-indigo-500" />
      default:
        return <Split className="h-4 w-4 text-gray-500" />
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
        return 'border-purple-300 bg-purple-50'
    }
  }

  const getConfigInfo = () => {
    if (!data.config) return ''
    
    switch (data.type) {
      case 'filter':
        return `Filter by: ${data.config.field || 'company'} ${data.config.operator || 'contains'} "${data.config.value || ''}"`
      case 'delay':
        return `Delay: ${data.config.duration || 30} ${data.config.unit || 'minutes'}`
      case 'condition':
        return `Condition: ${data.config.condition || 'if/then'}`
      case 'loop':
        return `Loop: ${data.config.count || 'infinite'} times`
      default:
        return ''
    }
  }

  return (
    <div className={`px-4 py-3 rounded-lg border-2 ${getStatusColor()} ${selected ? 'ring-2 ring-purple-300 ring-offset-1' : ''} shadow-sm min-w-[180px] max-w-[250px]`}>
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
          
          {data.error && (
            <div className="text-xs text-red-600 mt-1 truncate">
              Error: {data.error.substring(0, 30)}...
            </div>
          )}
          
          <div className="text-xs text-purple-600 font-medium mt-2">
            ⚡ CONTROL
          </div>
        </div>
        
        {data.status === 'running' && (
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0"></div>
        )}
        {data.status === 'failed' && (
          <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0"></div>
        )}
      </div>
      
      {/* Input handle */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 !bg-gray-400 !border-2 !border-white"
        id="target"
      />
      
      {/* Output handle(s) */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 !bg-gray-400 !border-2 !border-white"
        id="source"
      />
      
      {/* Additional handles for specific node types */}
      {(data.type === 'split' || data.type === 'condition') && (
        <>
          <Handle 
            type="source" 
            position={Position.Left} 
            className="w-3 h-3 !bg-gray-400 !border-2 !border-white"
            id="left"
            style={{ left: '10%' }}
          />
          <Handle 
            type="source" 
            position={Position.Right} 
            className="w-3 h-3 !bg-gray-400 !border-2 !border-white"
            id="right"
            style={{ left: '90%' }}
          />
        </>
      )}
      
      {/* Handle for merge nodes */}
      {data.type === 'merge' && (
        <>
          <Handle 
            type="target" 
            position={Position.Left} 
            className="w-3 h-3 !bg-gray-400 !border-2 !border-white"
            id="merge-left"
            style={{ top: '30%' }}
          />
          <Handle 
            type="target" 
            position={Position.Right} 
            className="w-3 h-3 !bg-gray-400 !border-2 !border-white"
            id="merge-right"
            style={{ top: '70%' }}
          />
        </>
      )}
      
      {/* Handle for error handlers */}
      {data.type === 'error_handler' && (
        <Handle 
          type="target" 
          position={Position.Left} 
          className="w-3 h-3 !bg-red-400 !border-2 !border-white"
          id="error-input"
          style={{ top: '50%' }}
        />
      )}
    </div>
  )
}

export default ControlNode