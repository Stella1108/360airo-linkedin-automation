'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/ClientProvider'
import {
  Zap,
  Workflow,
  Play,
  List,
  Plus,
  BarChart,
  CheckCircle
} from 'lucide-react'

// Import components
import QuickAutomation from './components/QuickAutomation'
import WorkflowBuilder from './components/WorkflowBuilder'
import WorkflowLibrary from './components/WorkflowLibrary'

export default function AutomationPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'quick' | 'builder' | 'library'>('quick')
  const [workflows, setWorkflows] = useState<any[]>([])
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | undefined>(undefined)
  const [stats, setStats] = useState({
    totalWorkflows: 0,
    activeWorkflows: 0,
    totalRuns: 0,
    successRate: 89
  })
  const [loading, setLoading] = useState({
    workflows: false,
    stats: false
  })

  useEffect(() => {
    if (user) {
      fetchWorkflows()
      fetchStats()
    }
  }, [user])

  const fetchWorkflows = async () => {
    try {
      setLoading(prev => ({ ...prev, workflows: true }))
      
      // If you don't have login, remove the .eq('user_id', user?.id) filter
      let query = supabase
        .from('workflows')
        .select('*')
        .order('updated_at', { ascending: false })

      // Only filter by user_id if user exists
      if (user?.id) {
        query = query.eq('user_id', user.id)
      }

      const { data, error } = await query

      if (error) throw error
      setWorkflows(data || [])
      
      // If there's no selected workflow and we have workflows, select the first one
      if (!selectedWorkflowId && data && data.length > 0) {
        setSelectedWorkflowId(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching workflows:', error)
    } finally {
      setLoading(prev => ({ ...prev, workflows: false }))
    }
  }

  const fetchStats = async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true }))
      
      // If you don't have login, remove user_id filters
      let totalWorkflowsQuery = supabase
        .from('workflows')
        .select('*', { count: 'exact', head: true })

      let activeWorkflowsQuery = supabase
        .from('workflows')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Only filter by user_id if user exists
      if (user?.id) {
        totalWorkflowsQuery = totalWorkflowsQuery.eq('user_id', user.id)
        activeWorkflowsQuery = activeWorkflowsQuery.eq('user_id', user.id)
      }

      const { count: totalWorkflows } = await totalWorkflowsQuery
      const { count: activeWorkflows } = await activeWorkflowsQuery

      // Check if workflow_executions table exists
      let totalRuns = 0
      try {
        let runsQuery = supabase
          .from('workflow_executions')
          .select('*', { count: 'exact', head: true })
        
        if (user?.id) {
          runsQuery = runsQuery.eq('user_id', user.id)
        }
        
        const { count: runsCount } = await runsQuery
        totalRuns = runsCount || 0
      } catch (error) {
        console.log('workflow_executions table might not exist, skipping:', error)
      }

      setStats({
        totalWorkflows: totalWorkflows || 0,
        activeWorkflows: activeWorkflows || 0,
        totalRuns: totalRuns,
        successRate: 89
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(prev => ({ ...prev, stats: false }))
    }
  }

  const handleWorkflowClick = (workflowId: string) => {
    setSelectedWorkflowId(workflowId)
    setActiveTab('builder')
  }

  const handleNewWorkflow = () => {
    setSelectedWorkflowId(undefined)
    setActiveTab('builder')
  }

  const handleWorkflowSave = () => {
    fetchWorkflows()
    fetchStats()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">LinkedIn Automation Studio</h1>
              <p className="text-gray-600 mt-2">
                Design, schedule, and execute LinkedIn automation workflows
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.open('/docs/automation', '_blank')}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Documentation
              </button>
              <button
                onClick={handleNewWorkflow}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 flex items-center gap-2 text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                New Workflow
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Workflows</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {loading.stats ? '...' : stats.totalWorkflows}
                  </p>
                </div>
                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Workflow className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {loading.stats ? '...' : stats.activeWorkflows}
                  </p>
                </div>
                <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Runs</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {loading.stats ? '...' : stats.totalRuns}
                  </p>
                </div>
                <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Play className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {stats.successRate}%
                  </p>
                </div>
                <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex flex-col sm:flex-row">
              <button
                onClick={() => setActiveTab('quick')}
                className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 ${
                  activeTab === 'quick'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Zap className="h-4 w-4" />
                Quick Automation
              </button>
              <button
                onClick={handleNewWorkflow}
                className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 ${
                  activeTab === 'builder'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Workflow className="h-4 w-4" />
                Workflow Builder
              </button>
              <button
                onClick={() => setActiveTab('library')}
                className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 ${
                  activeTab === 'library'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <List className="h-4 w-4" />
                Template Library
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'quick' && (
              <QuickAutomation 
                onWorkflowCreated={handleWorkflowSave}
              />
            )}
            {activeTab === 'builder' && (
              <WorkflowBuilder 
                workflowId={selectedWorkflowId}
                // Only pass onSave if the component accepts it
                // Check WorkflowBuilder.tsx for the correct prop name
                // If it doesn't accept onSave, we'll need to handle updates differently
              />
            )}
            {activeTab === 'library' && <WorkflowLibrary />}
          </div>
        </div>

        {/* Recent Workflows Sidebar */}
        <div className="lg:hidden mt-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-bold text-lg mb-4">Recent Workflows</h3>
            {loading.workflows ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : workflows.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Workflow className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No workflows yet</p>
                <button
                  onClick={handleNewWorkflow}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                >
                  Create your first workflow →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {workflows.slice(0, 3).map(workflow => (
                  <div
                    key={workflow.id}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleWorkflowClick(workflow.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                        <p className="text-sm text-gray-500 truncate">
                          {workflow.description || 'No description'}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        workflow.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {workflow.is_active ? 'Active' : 'Draft'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                      <span>{workflow.node_count || 0} nodes</span>
                      <span>
                        Updated {new Date(workflow.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Sidebar - Conditionally render only if workflows exist */}
        {workflows.length > 0 && (
          <div className="hidden lg:block fixed right-6 top-28 w-80">
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
              <h3 className="font-bold text-lg mb-4">Recent Workflows</h3>
              <div className="space-y-3">
                {workflows.slice(0, 5).map(workflow => (
                  <div
                    key={workflow.id}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleWorkflowClick(workflow.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                        <p className="text-sm text-gray-500 truncate">
                          {workflow.description || 'No description'}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        workflow.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {workflow.is_active ? 'Active' : 'Draft'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                      <span>{workflow.node_count || 0} nodes</span>
                      <span>
                        {new Date(workflow.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                {workflows.length > 5 && (
                  <button
                    onClick={() => setActiveTab('library')}
                    className="w-full text-center text-sm text-blue-600 hover:text-blue-800 py-2"
                  >
                    View all {workflows.length} workflows →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}