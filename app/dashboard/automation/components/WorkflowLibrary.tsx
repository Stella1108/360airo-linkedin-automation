// app/dashboard/automation/components/WorkflowLibrary.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/ClientProvider'
import toast from 'react-hot-toast'
import {
  Search,
  Grid,
  List,
  Play,
  Copy,
  Trash2,
  Eye,
  Star,
  Users,
  Calendar,
  Zap,
  Workflow,
  Plus,
  MoreVertical,
  AlertCircle,
  RefreshCw,
  Download,
  Pause,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  History,
  BarChart
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Workflow {
  id: string
  name: string
  description?: string
  status?: string
  nodes?: any[]
  edges?: any[]
  node_count: number
  edge_count: number
  created_at: string
  updated_at: string
  user_id?: string
  last_execution?: any
  execution_count?: number
}

interface Template {
  id: string
  name: string
  description: string
  nodes: number
  icon: React.ReactNode
  color: string
  category: string
  onClick: () => void
}

interface WorkflowExecution {
  id: string
  workflow_id: string
  workflow_name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  started_at: string
  completed_at?: string
  results?: any
  config?: any
  error?: string
}

export default function WorkflowLibrary() {
  const { user } = useAuth()
  const router = useRouter()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'drafts'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([])
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [executions, setExecutions] = useState<Record<string, WorkflowExecution[]>>({})
  const [showExecutionsFor, setShowExecutionsFor] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchWorkflows()
    }
  }, [user])

  const fetchWorkflows = async () => {
    try {
      setIsRefreshing(true)
      setLoading(true)
      setFetchError(null)
      
      if (!user) {
        setFetchError('Please log in to view workflows')
        return
      }

      console.log('Fetching workflows for user:', user.id)

      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching workflows:', error)
        setFetchError(`Failed to load workflows: ${error.message}`)
        return
      }

      console.log('Fetched workflows data:', data)
      
      // Transform data to match your database schema
      const transformedData: Workflow[] = (data || []).map((workflow: any) => ({
        id: workflow.id,
        name: workflow.name || 'Unnamed Workflow',
        description: workflow.description || '',
        status: workflow.status || 'draft', // Use status instead of is_active
        nodes: workflow.nodes || [],
        edges: workflow.edges || [],
        node_count: workflow.node_count || (Array.isArray(workflow.nodes) ? workflow.nodes.length : 0),
        edge_count: workflow.edge_count || (Array.isArray(workflow.edges) ? workflow.edges.length : 0),
        created_at: workflow.created_at || new Date().toISOString(),
        updated_at: workflow.updated_at || new Date().toISOString(),
        user_id: workflow.user_id
      }))
      
      setWorkflows(transformedData)
      
      // Fetch executions for each workflow
      if (transformedData.length > 0) {
        const workflowIds = transformedData.map(w => w.id)
        const { data: executionsData, error: executionsError } = await supabase
          .from('workflow_executions')
          .select('*')
          .in('workflow_id', workflowIds)
          .order('started_at', { ascending: false })

        if (!executionsError && executionsData) {
          const executionsByWorkflow: Record<string, WorkflowExecution[]> = {}
          executionsData.forEach(execution => {
            if (!executionsByWorkflow[execution.workflow_id]) {
              executionsByWorkflow[execution.workflow_id] = []
            }
            executionsByWorkflow[execution.workflow_id].push(execution)
          })
          setExecutions(executionsByWorkflow)
        }
      }
      
    } catch (error: any) {
      console.error('Unexpected error:', error)
      setFetchError(`An unexpected error occurred: ${error.message}`)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const createNewWorkflow = async () => {
    try {
      if (!user) {
        toast.error('Please log in to create a workflow')
        return
      }

      const { data, error } = await supabase
        .from('workflows')
        .insert([{
          name: 'New Workflow',
          description: 'Automation workflow',
          nodes: [],
          edges: [],
          node_count: 0,
          edge_count: 0,
          status: 'draft',
          user_id: user.id
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating workflow:', error)
        // Try without status if column doesn't exist
        if (error.code === '42703') {
          const { data: retryData, error: retryError } = await supabase
            .from('workflows')
            .insert([{
              name: 'New Workflow',
              description: 'Automation workflow',
              nodes: [],
              edges: [],
              node_count: 0,
              edge_count: 0,
              user_id: user.id
            }])
            .select()
            .single()

          if (retryError) throw retryError
          
          toast.success('New workflow created')
          router.push(`/dashboard/automation/workflow/${retryData.id}`)
          return
        }
        throw error
      }
      
      toast.success('New workflow created')
      router.push(`/dashboard/automation/workflow/${data.id}`)
    } catch (error: any) {
      console.error('Error creating workflow:', error)
      toast.error(error.message || 'Failed to create workflow')
    }
  }

  const duplicateWorkflow = async (workflowId: string) => {
    try {
      const workflow = workflows.find(w => w.id === workflowId)
      if (!workflow) return

      const { data: original, error: fetchError } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single()

      if (fetchError) throw fetchError

      // Create duplicate
      const duplicateData = {
        name: `${original.name} (Copy)`,
        description: original.description,
        nodes: original.nodes,
        edges: original.edges,
        node_count: original.node_count,
        edge_count: original.edge_count,
        status: 'draft',
        user_id: original.user_id
      }

      const { data, error } = await supabase
        .from('workflows')
        .insert([duplicateData])
        .select()
        .single()

      if (error) throw error

      toast.success('Workflow duplicated successfully')
      fetchWorkflows()
    } catch (error: any) {
      console.error('Error duplicating workflow:', error)
      toast.error(error.message || 'Failed to duplicate workflow')
    }
  }

  const deleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', workflowId)

      if (error) throw error

      setWorkflows(workflows.filter(w => w.id !== workflowId))
      setSelectedWorkflows(selectedWorkflows.filter(id => id !== workflowId))
      toast.success('Workflow deleted successfully')
    } catch (error: any) {
      console.error('Error deleting workflow:', error)
      toast.error(error.message || 'Failed to delete workflow')
    }
  }

  const deleteSelectedWorkflows = async () => {
    if (selectedWorkflows.length === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedWorkflows.length} workflow(s)? This action cannot be undone.`)) return

    try {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .in('id', selectedWorkflows)

      if (error) throw error

      setWorkflows(workflows.filter(w => !selectedWorkflows.includes(w.id)))
      setSelectedWorkflows([])
      toast.success(`${selectedWorkflows.length} workflow(s) deleted successfully`)
    } catch (error: any) {
      console.error('Error deleting workflows:', error)
      toast.error(error.message || 'Failed to delete workflows')
    }
  }

  const toggleWorkflowStatus = async (workflowId: string) => {
    try {
      const workflow = workflows.find(w => w.id === workflowId)
      if (!workflow) return

      const newStatus = workflow.status === 'active' ? 'draft' : 'active'
      
      const { error } = await supabase
        .from('workflows')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', workflowId)

      if (error) {
        // If status column doesn't exist, just update the timestamp
        if (error.code === '42703') {
          const { error: updateError } = await supabase
            .from('workflows')
            .update({ 
              updated_at: new Date().toISOString() 
            })
            .eq('id', workflowId)

          if (updateError) throw updateError
        } else {
          throw error
        }
      }

      setWorkflows(workflows.map(w => 
        w.id === workflowId 
          ? { ...w, status: newStatus, updated_at: new Date().toISOString() }
          : w
      ))
      
      toast.success(`Workflow ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`)
    } catch (error: any) {
      console.error('Error toggling workflow status:', error)
      toast.error(error.message || 'Failed to update workflow status')
    }
  }

  const executeWorkflow = async (workflowId: string) => {
    try {
      const workflow = workflows.find(w => w.id === workflowId)
      if (!workflow) return

      if (workflow.node_count === 0) {
        toast.error('Workflow has no nodes. Please add nodes first.')
        return
      }

      const loadingToast = toast.loading(`Executing workflow: ${workflow.name}`)
      
      // First, create an execution record
      const { data: execution, error: executionError } = await supabase
        .from('workflow_executions')
        .insert([{
          workflow_id: workflowId,
          workflow_name: workflow.name,
          status: 'running',
          started_at: new Date().toISOString(),
          config: { 
            user_id: user?.id,
            workflow_data: workflow
          }
        }])
        .select()
        .single()

      if (executionError) throw executionError

      // Call execution API
      const response = await fetch('/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          workflowData: workflow,
          executionId: execution.id,
          userId: user?.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        // Update execution status to failed
        await supabase
          .from('workflow_executions')
          .update({ 
            status: 'failed',
            error: errorData.error || 'Execution failed',
            completed_at: new Date().toISOString()
          })
          .eq('id', execution.id)
        
        throw new Error(errorData.error || 'Execution failed')
      }

      toast.dismiss(loadingToast)
      toast.success(`Workflow "${workflow.name}" execution started!`)
      
      // Refresh executions list
      await fetchWorkflowExecutions(workflowId)

    } catch (error: any) {
      toast.dismiss()
      console.error('Error executing workflow:', error)
      toast.error(error.message || 'Failed to execute workflow')
    }
  }

  const fetchWorkflowExecutions = async (workflowId: string) => {
    try {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('started_at', { ascending: false })

      if (!error && data) {
        setExecutions(prev => ({
          ...prev,
          [workflowId]: data
        }))
      }
    } catch (error) {
      console.error('Error fetching executions:', error)
    }
  }

  const exportWorkflow = (workflow: Workflow) => {
    try {
      const exportData = {
        ...workflow,
        exportDate: new Date().toISOString(),
        version: '1.0',
        exportSource: 'Automation Workflow Library'
      }
      
      const dataStr = JSON.stringify(exportData, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
      
      const exportFileName = `${workflow.name.replace(/\s+/g, '_')}_workflow_${new Date().toISOString().split('T')[0]}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileName)
      document.body.appendChild(linkElement)
      linkElement.click()
      document.body.removeChild(linkElement)
      
      toast.success('Workflow exported successfully')
    } catch (error) {
      console.error('Error exporting workflow:', error)
      toast.error('Failed to export workflow')
    }
  }

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(search.toLowerCase()) ||
      (workflow.description?.toLowerCase().includes(search.toLowerCase()) || false)
    
    const matchesFilter = filter === 'all' ||
      (filter === 'active' && workflow.status === 'active') ||
      (filter === 'drafts' && workflow.status !== 'active')
    
    return matchesSearch && matchesFilter
  })

  const templates: Template[] = [
    {
      id: 'template-1',
      name: 'Daily Connection Campaign',
      description: 'Send daily connection requests to targeted profiles',
      nodes: 4,
      icon: <Users className="h-8 w-8 text-white" />,
      color: 'bg-gradient-to-br from-blue-500 to-blue-700',
      category: 'Outreach',
      onClick: () => createFromTemplate('connection_campaign')
    },
    {
      id: 'template-2',
      name: 'Welcome Message Sequence',
      description: 'Send automated welcome messages to new connections',
      nodes: 5,
      icon: <Calendar className="h-8 w-8 text-white" />,
      color: 'bg-gradient-to-br from-green-500 to-green-700',
      category: 'Engagement',
      onClick: () => createFromTemplate('welcome_messages')
    },
    {
      id: 'template-3',
      name: 'Smart Profile Visitor',
      description: 'Visit profiles strategically to increase visibility',
      nodes: 3,
      icon: <Eye className="h-8 w-8 text-white" />,
      color: 'bg-gradient-to-br from-purple-500 to-purple-700',
      category: 'Visibility',
      onClick: () => createFromTemplate('profile_visitor')
    },
    {
      id: 'template-4',
      name: 'Content Engagement',
      description: 'Automatically like and comment on relevant posts',
      nodes: 6,
      icon: <Zap className="h-8 w-8 text-white" />,
      color: 'bg-gradient-to-br from-orange-500 to-orange-700',
      category: 'Content',
      onClick: () => createFromTemplate('content_engagement')
    }
  ]

  const createFromTemplate = async (templateType: string) => {
    try {
      let templateData: any = {
        name: '',
        description: '',
        nodes: [],
        edges: []
      }

      switch (templateType) {
        case 'connection_campaign':
          templateData = {
            name: 'Daily Connection Campaign',
            description: 'Send daily connection requests to targeted profiles',
            nodes: [
              {
                id: 'trigger-1',
                type: 'trigger',
                position: { x: 250, y: 50 },
                data: { 
                  label: 'Schedule Trigger',
                  type: 'schedule',
                  config: { 
                    scheduleType: 'daily',
                    time: '09:00',
                    daysOfWeek: [1, 2, 3, 4, 5]
                  }
                }
              },
              {
                id: 'action-1',
                type: 'action',
                position: { x: 250, y: 200 },
                data: { 
                  label: 'Send Connection',
                  type: 'send_connection',
                  config: { 
                    message: 'Hi {{name}}, I\'d like to connect with you.',
                    limitPerDay: 10,
                    delayBetween: 30
                  }
                }
              }
            ],
            edges: [
              {
                id: 'edge-1',
                source: 'trigger-1',
                target: 'action-1',
                animated: true
              }
            ]
          }
          break
        case 'welcome_messages':
          templateData = {
            name: 'Welcome Message Sequence',
            description: 'Send automated welcome messages to new connections',
            nodes: [],
            edges: []
          }
          break
        case 'profile_visitor':
          templateData = {
            name: 'Smart Profile Visitor',
            description: 'Visit profiles strategically to increase visibility',
            nodes: [],
            edges: []
          }
          break
        case 'content_engagement':
          templateData = {
            name: 'Content Engagement',
            description: 'Automatically like and comment on relevant posts',
            nodes: [],
            edges: []
          }
          break
      }

      const insertData: any = {
        ...templateData,
        node_count: templateData.nodes.length,
        edge_count: templateData.edges.length,
        status: 'draft',
        user_id: user?.id
      }

      const { data, error } = await supabase
        .from('workflows')
        .insert([insertData])
        .select()
        .single()

      if (error) throw error

      toast.success('Template workflow created successfully')
      router.push(`/dashboard/automation/workflow/${data.id}`)
    } catch (error: any) {
      console.error('Error creating from template:', error)
      toast.error(error.message || 'Failed to create workflow from template')
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 0) return 'Today'
      if (diffDays === 1) return 'Yesterday'
      if (diffDays < 7) return `${diffDays} days ago`
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
      
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch (error) {
      return 'Unknown date'
    }
  }

  const formatExecutionDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Unknown date'
    }
  }

  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const selectAllWorkflows = () => {
    if (selectedWorkflows.length === filteredWorkflows.length) {
      setSelectedWorkflows([])
    } else {
      setSelectedWorkflows(filteredWorkflows.map(w => w.id))
    }
  }

  const renderExecutionsPanel = (workflowId: string) => {
    const workflowExecutions = executions[workflowId] || []
    const workflow = workflows.find(w => w.id === workflowId)

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Execution History</h3>
                <p className="text-gray-600">{workflow?.name}</p>
              </div>
              <button
                onClick={() => setShowExecutionsFor(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {workflowExecutions.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No executions yet</h4>
                <p className="text-gray-600">Execute this workflow to see execution history</p>
              </div>
            ) : (
              <div className="space-y-4">
                {workflowExecutions.map(execution => (
                  <div key={execution.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded ${getExecutionStatusColor(execution.status)}`}>
                            {execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatExecutionDate(execution.started_at)}
                          </span>
                        </div>
                        {execution.completed_at && (
                          <div className="text-xs text-gray-500 mt-1">
                            Completed: {formatExecutionDate(execution.completed_at)}
                          </div>
                        )}
                      </div>
                      {execution.results && (
                        <button
                          onClick={() => {
                            const resultsStr = JSON.stringify(execution.results, null, 2)
                            const blob = new Blob([resultsStr], { type: 'application/json' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `execution_${execution.id}_results.json`
                            a.click()
                            URL.revokeObjectURL(url)
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Download Results
                        </button>
                      )}
                    </div>
                    
                    {execution.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                        <div className="text-sm text-red-800 font-medium">Error:</div>
                        <div className="text-sm text-red-600 font-mono mt-1">{execution.error}</div>
                      </div>
                    )}
                    
                    {execution.results && (
                      <div className="mt-3 text-sm text-gray-600">
                        <div className="font-medium mb-1">Results Summary:</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {execution.results.total_connections && (
                            <div>Connections sent: {execution.results.total_connections}</div>
                          )}
                          {execution.results.success_count && (
                            <div>Successful: {execution.results.success_count}</div>
                          )}
                          {execution.results.failed_count && (
                            <div>Failed: {execution.results.failed_count}</div>
                          )}
                          {execution.results.duration && (
                            <div>Duration: {execution.results.duration}ms</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between">
              <div className="text-sm text-gray-600">
                Total executions: {workflowExecutions.length}
              </div>
              <button
                onClick={() => executeWorkflow(workflowId)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Run Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Workflow Library</h2>
          <p className="text-gray-600">Browse and manage all your automation workflows</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchWorkflows}
            disabled={isRefreshing}
            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={createNewWorkflow}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Workflow
          </button>
        </div>
      </div>

      {/* Error Display */}
      {fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-in fade-in">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h4 className="font-medium text-red-800">Error Loading Workflows</h4>
          </div>
          <p className="text-red-700 text-sm mb-3">{fetchError}</p>
          <div className="flex gap-2">
            <button
              onClick={fetchWorkflows}
              className="px-3 py-1.5 text-sm bg-red-100 text-red-800 rounded-lg hover:bg-red-200 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search workflows by name or description..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Filters & View */}
          <div className="flex items-center gap-2">
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              {[
                { value: 'all', label: 'All', count: workflows.length },
                { value: 'active', label: 'Active', count: workflows.filter(w => w.status === 'active').length },
                { value: 'drafts', label: 'Drafts', count: workflows.filter(w => w.status !== 'active').length }
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value as any)}
                  className={`px-3 py-2 text-sm transition-colors relative ${
                    filter === f.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {f.label}
                  {f.count > 0 && (
                    <span className={`absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center rounded-full ${
                      filter === f.value
                        ? 'bg-blue-800 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* View Toggle */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid' ? 'bg-gray-100 text-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                aria-label="Grid view"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${
                  viewMode === 'list' ? 'bg-gray-100 text-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Section */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Quick Start Templates
            </h3>
            <p className="text-gray-600">Start quickly with these ready-to-use templates</p>
          </div>
          <button
            onClick={createNewWorkflow}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Skip Templates
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.map(template => (
            <button
              key={template.id}
              onClick={template.onClick}
              className="border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-lg transition-all text-left group"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className={`h-12 w-12 rounded-lg ${template.color} flex items-center justify-center`}>
                  {template.icon}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 group-hover:text-blue-600">{template.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {template.category}
                    </span>
                    <span className="text-xs text-gray-500">{template.nodes} nodes</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>
              <span className="text-sm text-blue-600 font-medium group-hover:text-blue-700 transition-colors">
                Use Template →
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Workflows Section */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="font-bold text-lg">Your Workflows</h3>
            <p className="text-gray-600 text-sm">
              {filteredWorkflows.length} workflow{filteredWorkflows.length !== 1 ? 's' : ''} 
              {search && ` matching "${search}"`}
            </p>
          </div>
          
          {filteredWorkflows.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={selectAllWorkflows}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {selectedWorkflows.length === filteredWorkflows.length ? 'Deselect All' : 'Select All'}
              </button>
              
              {selectedWorkflows.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {selectedWorkflows.length} selected
                  </span>
                  <button
                    onClick={deleteSelectedWorkflows}
                    className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete Selected
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && !fetchError && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredWorkflows.length === 0 && (
          <div className="text-center py-12">
            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {search ? (
                <Search className="h-8 w-8 text-gray-400" />
              ) : (
                <Workflow className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {search ? 'No matching workflows found' : 'No workflows yet'}
            </h4>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              {search 
                ? 'Try a different search term or clear the search'
                : 'Get started by creating a new workflow or using a template'
              }
            </p>
            <div className="flex gap-3 justify-center">
              {search ? (
                <button
                  onClick={() => setSearch('')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Search
                </button>
              ) : (
                <>
                  <button
                    onClick={createNewWorkflow}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Create Workflow
                  </button>
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    View Templates
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Workflows Grid View */}
        {!loading && filteredWorkflows.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkflows.map(workflow => {
              const workflowExecutions = executions[workflow.id] || []
              const lastExecution = workflowExecutions[0]
              const executionCount = workflowExecutions.length
              
              return (
                <div
                  key={workflow.id}
                  className={`border rounded-xl p-5 hover:shadow-lg transition-all relative ${
                    selectedWorkflows.includes(workflow.id) 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="absolute top-3 left-3">
                    <input
                      type="checkbox"
                      checked={selectedWorkflows.includes(workflow.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedWorkflows([...selectedWorkflows, workflow.id])
                        } else {
                          setSelectedWorkflows(selectedWorkflows.filter(id => id !== workflow.id))
                        }
                      }}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex justify-between items-start mb-3 ml-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">{workflow.name}</h4>
                        <div className="flex gap-1 flex-shrink-0">
                          {workflow.status === 'active' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          workflow.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {workflow.status === 'active' ? 'Active' : 'Draft'}
                        </span>
                        {executionCount > 0 && (
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded flex items-center gap-1">
                            <History className="h-3 w-3" />
                            {executionCount} run{executionCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setShowActionsMenu(showActionsMenu === workflow.id ? null : workflow.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      
                      {showActionsMenu === workflow.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-40"
                            onClick={() => setShowActionsMenu(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                            <button
                              onClick={() => {
                                router.push(`/dashboard/automation/workflow/${workflow.id}`)
                                setShowActionsMenu(null)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                            >
                              <Eye className="h-3 w-3" />
                              Open Editor
                            </button>
                            <button
                              onClick={() => {
                                toggleWorkflowStatus(workflow.id)
                                setShowActionsMenu(null)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                            >
                              {workflow.status === 'active' ? (
                                <>
                                  <Pause className="h-3 w-3" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Zap className="h-3 w-3" />
                                  Activate
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => setShowExecutionsFor(workflow.id)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                            >
                              <History className="h-3 w-3" />
                              View Executions
                            </button>
                            <button
                              onClick={() => {
                                duplicateWorkflow(workflow.id)
                                setShowActionsMenu(null)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                            >
                              <Copy className="h-3 w-3" />
                              Duplicate
                            </button>
                            <button
                              onClick={() => {
                                exportWorkflow(workflow)
                                setShowActionsMenu(null)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                            >
                              <Download className="h-3 w-3" />
                              Export
                            </button>
                            <hr className="my-1 border-gray-200" />
                            <button
                              onClick={() => {
                                deleteWorkflow(workflow.id)
                                setShowActionsMenu(null)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                    {workflow.description || 'No description provided'}
                  </p>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {workflow.node_count || 0} nodes
                        </span>
                        <span className="flex items-center gap-1">
                          <Workflow className="h-3 w-3" />
                          {workflow.edge_count || 0} edges
                        </span>
                      </div>
                      <div className="text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(workflow.updated_at)}
                      </div>
                    </div>
                    
                    {lastExecution && (
                      <div className="text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-0.5 rounded ${getExecutionStatusColor(lastExecution.status)}`}>
                            Last run: {lastExecution.status}
                          </span>
                          <span>{formatDate(lastExecution.started_at)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/automation/workflow/${workflow.id}`)}
                      className="flex-1 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => executeWorkflow(workflow.id)}
                      disabled={workflow.node_count === 0}
                      className={`flex-1 py-2 text-sm rounded-lg flex items-center justify-center gap-1 transition-colors ${
                        workflow.node_count > 0
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Play className="h-3 w-3" />
                      Run
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Workflows List View */}
        {!loading && filteredWorkflows.length > 0 && viewMode === 'list' && (
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm text-gray-500 border-b border-gray-200">
              <div className="col-span-1"></div>
              <div className="col-span-4">Name</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2">Stats</div>
              <div className="col-span-2">Last Run</div>
              <div className="col-span-2">Updated</div>
            </div>
            {filteredWorkflows.map(workflow => {
              const workflowExecutions = executions[workflow.id] || []
              const lastExecution = workflowExecutions[0]
              
              return (
                <div
                  key={workflow.id}
                  className={`grid grid-cols-12 gap-4 items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                    selectedWorkflows.includes(workflow.id) 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="col-span-1">
                    <input
                      type="checkbox"
                      checked={selectedWorkflows.includes(workflow.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedWorkflows([...selectedWorkflows, workflow.id])
                        } else {
                          setSelectedWorkflows(selectedWorkflows.filter(id => id !== workflow.id))
                        }
                      }}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="col-span-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        workflow.status === 'active'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <Workflow className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{workflow.name}</h4>
                        <p className="text-sm text-gray-500 truncate">
                          {workflow.description || 'No description'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-1">
                    <div className="flex gap-1">
                      <span className={`text-xs px-2 py-1 rounded ${
                        workflow.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {workflow.status === 'active' ? 'Active' : 'Draft'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        {workflow.node_count || 0} nodes
                      </div>
                      <div className="flex items-center gap-2">
                        <Workflow className="h-3 w-3" />
                        {workflow.edge_count || 0} edges
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    {lastExecution ? (
                      <div className="text-sm">
                        <div className={`px-2 py-1 text-xs rounded ${getExecutionStatusColor(lastExecution.status)}`}>
                          {lastExecution.status}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(lastExecution.started_at)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">Never run</div>
                    )}
                  </div>
                  
                  <div className="col-span-2">
                    <div className="text-sm text-gray-500">
                      {formatDate(workflow.updated_at)}
                    </div>
                  </div>
                  
                  <div className="col-span-12 md:col-span-0 flex justify-end gap-2 mt-4 md:mt-0">
                    <button
                      onClick={() => setShowExecutionsFor(workflow.id)}
                      className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1 transition-colors"
                    >
                      <History className="h-3 w-3" />
                      History
                    </button>
                    <button
                      onClick={() => executeWorkflow(workflow.id)}
                      disabled={workflow.node_count === 0}
                      className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 transition-colors ${
                        workflow.node_count > 0
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Play className="h-3 w-3" />
                      Run
                    </button>
                    <button
                      onClick={() => router.push(`/dashboard/automation/workflow/${workflow.id}`)}
                      className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowActionsMenu(showActionsMenu === workflow.id ? null : workflow.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      
                      {showActionsMenu === workflow.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-40"
                            onClick={() => setShowActionsMenu(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                            <button
                              onClick={() => {
                                toggleWorkflowStatus(workflow.id)
                                setShowActionsMenu(null)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                            >
                              {workflow.status === 'active' ? (
                                <>
                                  <Pause className="h-3 w-3" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Zap className="h-3 w-3" />
                                  Activate
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                duplicateWorkflow(workflow.id)
                                setShowActionsMenu(null)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                            >
                              <Copy className="h-3 w-3" />
                              Duplicate
                            </button>
                            <button
                              onClick={() => {
                                exportWorkflow(workflow)
                                setShowActionsMenu(null)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                            >
                              <Download className="h-3 w-3" />
                              Export
                            </button>
                            <hr className="my-1 border-gray-200" />
                            <button
                              onClick={() => {
                                deleteWorkflow(workflow.id)
                                setShowActionsMenu(null)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Executions Modal */}
      {showExecutionsFor && renderExecutionsPanel(showExecutionsFor)}
    </div>
  )
}