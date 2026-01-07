// app/automation/components/NodeLibraryPanel.tsx
'use client'

import React from 'react'
import { 
  Calendar, 
  Globe, 
  Play, 
  Clock,
  UserPlus,
  MessageSquare,
  Eye,
  ThumbsUp,
  Database,
  Linkedin,
  Filter,
  GitBranch,
  GitMerge,
  AlertCircle,
  RefreshCw,
  Code,
  FileText,
  Bell,
  Mail,
  Link,
  Users,
  Zap,
  Settings,
  Clock as ClockIcon
} from 'lucide-react'

interface NodeLibraryPanelProps {
  isOpen: boolean
  onDragStart: (event: React.DragEvent, nodeType: string) => void
  draggingNodeType: string | null
  onAddNode: (nodeType: string) => void
}

const NodeLibraryPanel: React.FC<NodeLibraryPanelProps> = ({ 
  isOpen, 
  onDragStart, 
  draggingNodeType,
  onAddNode 
}) => {
  if (!isOpen) return null

  const nodeCategories = [
    {
      title: 'LinkedIn Accounts',
      icon: <Users className="h-4 w-4" />,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      nodes: [
        { 
          type: 'trigger:linkedin_account', 
          label: 'LinkedIn Account', 
          description: 'Connect LinkedIn account',
          icon: <Linkedin className="h-4 w-4" />,
          color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
        }
      ]
    },
    {
      title: 'Triggers',
      icon: <Zap className="h-4 w-4" />,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      nodes: [
        { 
          type: 'trigger:schedule', 
          label: 'Schedule', 
          description: 'Time-based trigger',
          icon: <Calendar className="h-4 w-4" />,
          color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
        },
        { 
          type: 'trigger:webhook', 
          label: 'Webhook', 
          description: 'HTTP webhook trigger',
          icon: <Globe className="h-4 w-4" />,
          color: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
        },
        { 
          type: 'trigger:manual', 
          label: 'Manual', 
          description: 'Manual trigger',
          icon: <Play className="h-4 w-4" />,
          color: 'bg-green-50 hover:bg-green-100 border-green-200'
        },
        { 
          type: 'trigger:interval', 
          label: 'Interval', 
          description: 'Interval trigger',
          icon: <Clock className="h-4 w-4" />,
          color: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200'
        }
      ]
    },
    {
      title: 'LinkedIn Actions',
      icon: <Linkedin className="h-4 w-4" />,
      color: 'bg-green-100 text-green-800 border-green-200',
      nodes: [
        { 
          type: 'action:send_connection', 
          label: 'Send Connection', 
          description: 'Send LinkedIn connection request',
          icon: <UserPlus className="h-4 w-4" />,
          color: 'bg-green-50 hover:bg-green-100 border-green-200'
        },
        { 
          type: 'action:send_message', 
          label: 'Send Message', 
          description: 'Send LinkedIn message',
          icon: <MessageSquare className="h-4 w-4" />,
          color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
        },
        { 
          type: 'action:visit_profile', 
          label: 'Visit Profile', 
          description: 'Visit LinkedIn profile',
          icon: <Eye className="h-4 w-4" />,
          color: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
        },
        { 
          type: 'action:like_post', 
          label: 'Like Post', 
          description: 'Like LinkedIn post',
          icon: <ThumbsUp className="h-4 w-4" />,
          color: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200'
        },
        { 
          type: 'action:extract_data', 
          label: 'Extract Data', 
          description: 'Extract profile data',
          icon: <Database className="h-4 w-4" />,
          color: 'bg-gray-50 hover:bg-gray-100 border-gray-200'
        },
        { 
          type: 'action:scrape_profile', 
          label: 'Scrape Profile', 
          description: 'Scrape profile details',
          icon: <Linkedin className="h-4 w-4" />,
          color: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
        }
      ]
    },
    {
      title: 'Control Flow',
      icon: <Settings className="h-4 w-4" />,
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      nodes: [
        { 
          type: 'control:delay', 
          label: 'Delay', 
          description: 'Add time delay',
          icon: <ClockIcon className="h-4 w-4" />,
          color: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200'
        },
        { 
          type: 'control:filter', 
          label: 'Filter', 
          description: 'Filter data',
          icon: <Filter className="h-4 w-4" />,
          color: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
        },
        { 
          type: 'control:split', 
          label: 'Split', 
          description: 'Split workflow path',
          icon: <GitBranch className="h-4 w-4" />,
          color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
        },
        { 
          type: 'control:merge', 
          label: 'Merge', 
          description: 'Merge workflow paths',
          icon: <GitMerge className="h-4 w-4" />,
          color: 'bg-green-50 hover:bg-green-100 border-green-200'
        },
        { 
          type: 'control:condition', 
          label: 'Condition', 
          description: 'Conditional logic',
          icon: <Code className="h-4 w-4" />,
          color: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
        },
        { 
          type: 'control:loop', 
          label: 'Loop', 
          description: 'Loop iterations',
          icon: <RefreshCw className="h-4 w-4" />,
          color: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200'
        },
        { 
          type: 'control:error_handler', 
          label: 'Error Handler', 
          description: 'Handle errors',
          icon: <AlertCircle className="h-4 w-4" />,
          color: 'bg-red-50 hover:bg-red-100 border-red-200'
        }
      ]
    },
    {
      title: 'Output',
      icon: <Database className="h-4 w-4" />,
      color: 'bg-red-100 text-red-800 border-red-200',
      nodes: [
        { 
          type: 'output:save_db', 
          label: 'Save to DB', 
          description: 'Save to database',
          icon: <Database className="h-4 w-4" />,
          color: 'bg-red-50 hover:bg-red-100 border-red-200'
        },
        { 
          type: 'output:notification', 
          label: 'Notification', 
          description: 'Send notification',
          icon: <Bell className="h-4 w-4" />,
          color: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200'
        },
        { 
          type: 'output:email', 
          label: 'Email', 
          description: 'Send email',
          icon: <Mail className="h-4 w-4" />,
          color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
        },
        { 
          type: 'output:webhook_out', 
          label: 'Webhook', 
          description: 'Send webhook',
          icon: <Link className="h-4 w-4" />,
          color: 'bg-green-50 hover:bg-green-100 border-green-200'
        },
        { 
          type: 'output:log', 
          label: 'Log', 
          description: 'Log results',
          icon: <FileText className="h-4 w-4" />,
          color: 'bg-gray-50 hover:bg-gray-100 border-gray-200'
        }
      ]
    }
  ]

  return (
    <div className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto p-4">
      <div className="mb-6">
        <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
          Node Library
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Drag and drop nodes onto the canvas, or click to add at default position
        </p>
      </div>

      {nodeCategories.map((category) => (
        <div key={category.title} className="mb-6">
          <h4 className={`text-sm font-semibold mb-3 px-3 py-1.5 rounded-lg ${category.color} border flex items-center gap-2`}>
            {category.icon}
            {category.title}
          </h4>
          <div className="space-y-2">
            {category.nodes.map((node) => (
              <div
                key={node.type}
                draggable
                onDragStart={(e) => onDragStart(e, node.type)}
                onClick={() => onAddNode(node.type)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border cursor-pointer transition-all duration-200 ${node.color} ${
                  draggingNodeType === node.type ? 'ring-2 ring-blue-500 scale-105' : 'hover:scale-[1.02]'
                } shadow-sm`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0">{node.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{node.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{node.description}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
                  <span>Drag or click</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default NodeLibraryPanel