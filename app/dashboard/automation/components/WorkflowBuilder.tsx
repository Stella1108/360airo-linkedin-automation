// app/automation/components/WorkflowBuilder.tsx
'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
  MarkerType,
  useOnSelectionChange,
  SelectionMode
} from 'reactflow'
import 'reactflow/dist/style.css'
import { 
  Save, 
  Play, 
  Download, 
  Upload,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Zap,
  Link as LinkIcon,
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'
import { useRouter } from 'next/navigation'

// Import Node Types
import TriggerNode from './nodes/TriggerNode'
import ActionNode from './nodes/ActionNode'
import ControlNode from './nodes/ControlNode'
import OutputNode from './nodes/OutputNode'
import NodeConfigPanel from './NodeConfigPanel'
import NodeLibraryPanel from './NodeLibraryPanel'

// Import Types
import { WorkflowNodeData } from '../types'

// Define custom node type
type WorkflowNode = Node<WorkflowNodeData>

// Register node types (moved outside component)
const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  control: ControlNode,
  output: OutputNode
}

interface WorkflowBuilderProps {
  workflowId?: string
}

function WorkflowBuilderComponent({ workflowId }: WorkflowBuilderProps) {
  const [nodes, setNodes] = useState<WorkflowNode[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [workflowName, setWorkflowName] = useState('New Workflow')
  const [workflowDescription, setWorkflowDescription] = useState('')
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null)
  const [showNodePanel, setShowNodePanel] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [selectedEdges, setSelectedEdges] = useState<string[]>([])
  const [draggingNodeType, setDraggingNodeType] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  
  const { fitView, screenToFlowPosition } = useReactFlow()
  const flowContainerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Load workflow if workflowId is provided
  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId)
    } else {
      // Initialize with default trigger node for new workflow
      const initialNodes: WorkflowNode[] = [
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
        }
      ]
      setNodes(initialNodes)
    }
  }, [workflowId])

  const loadWorkflow = async (id: string) => {
    try {
      setIsLoading(true)
      console.log('Loading workflow with ID:', id)
      
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error loading workflow:', error)
        toast.error('Failed to load workflow')
        return
      }

      console.log('Loaded workflow data:', data)

      // Set workflow info
      setWorkflowName(data.name || 'Unnamed Workflow')
      setWorkflowDescription(data.description || '')

      // Parse nodes and edges
      const loadedNodes = Array.isArray(data.nodes) ? data.nodes.map((node: any) => ({
        ...node,
        data: {
          ...node.data,
          config: node.data?.config || {}
        }
      })) : []

      const loadedEdges = Array.isArray(data.edges) ? data.edges : []

      console.log('Loaded nodes:', loadedNodes)
      console.log('Loaded edges:', loadedEdges)

      setNodes(loadedNodes)
      setEdges(loadedEdges)

      toast.success('Workflow loaded successfully')
    } catch (error) {
      console.error('Error loading workflow:', error)
      toast.error('Failed to load workflow')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle drag over for node dropping
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  // Handle drop to add node
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    
    const nodeType = event.dataTransfer.getData('application/reactflow')
    if (!nodeType) return
    
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })
    
    addNodeAtPosition(nodeType, position)
    setDraggingNodeType(null)
  }, [screenToFlowPosition])

  // Add node at specific position
  const addNodeAtPosition = (nodeType: string, position: { x: number, y: number }) => {
    const [type, subtype] = nodeType.split(':')
    const newNodeId = `${type}-${uuidv4()}`
    
    let nodeData: WorkflowNodeData = { 
      label: `${subtype.replace('_', ' ')} Node`,
      type: subtype,
      config: getDefaultConfig(subtype)
    }
    
    // Add LinkedIn-specific configurations
    if (subtype === 'linkedin_account') {
      nodeData.label = 'LinkedIn Account'
      nodeData.config = {
        accountId: '',
        name: 'My LinkedIn Account',
        cookies: '',
        isActive: true
      }
    }
    
    const newNode: WorkflowNode = {
      id: newNodeId,
      type: type as any,
      position,
      data: nodeData
    }
    
    setNodes(nds => [...nds, newNode])
    
    // Auto-connect if there's a selected node
    if (selectedNode && selectedNode.id) {
      const newEdge: Edge = {
        id: `edge-${selectedNode.id}-${newNodeId}`,
        source: selectedNode.id,
        target: newNodeId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#3b82f6',
        },
      }
      setEdges(eds => [...eds, newEdge])
    }
    
    toast.success(`Added ${nodeData.label}`)
  }

  const getDefaultConfig = (subtype: string): any => {
    switch (subtype) {
      case 'send_connection':
        return {
          message: 'Hi {{name}}, I\'d like to connect with you.',
          limitPerDay: 3,
          delayBetween: 30,
          customNote: '',
          targetAudience: 'recruiters',
          maxConnections: 50
        }
      case 'linkedin_account':
        return {
          accountId: '',
          name: 'LinkedIn Account',
          cookies: '',
          proxy: '',
          isActive: true,
          dailyLimit: 100
        }
      case 'delay':
        return { duration: 30, unit: 'minutes' }
      case 'filter':
        return { 
          field: 'company',
          operator: 'contains',
          value: 'Tech',
          caseSensitive: false
        }
      case 'extract_data':
        return { 
          fields: ['name', 'company', 'title', 'location', 'connections'],
          source: 'search_results',
          saveTo: 'database'
        }
      case 'webhook':
        return { url: '', method: 'POST', headers: {}, retryCount: 3 }
      case 'schedule':
        return {
          scheduleType: 'daily',
          time: '09:00',
          daysOfWeek: [1, 2, 3, 4, 5],
          timezone: 'UTC'
        }
      case 'log':
        return { format: 'json', level: 'info', destination: 'console' }
      default:
        return {}
    }
  }

  // Handle node changes
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds) as WorkflowNode[]),
    []
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  )

  const onConnect = useCallback(
    (params: Connection) => {
      // Ensure source and target are not null
      if (!params.source || !params.target) {
        toast.error('Invalid connection')
        return
      }
      
      const sourceNode = nodes.find(n => n.id === params.source)
      const targetNode = nodes.find(n => n.id === params.target)
      
      if (sourceNode && targetNode) {
        // Validation rules
        if (sourceNode.type === 'output') {
          toast.error('Output nodes can only receive connections')
          return
        }
        
        if (targetNode.type === 'trigger') {
          toast.error('Cannot connect into trigger nodes')
          return
        }
        
        const newEdge: Edge = {
          id: `edge-${params.source}-${params.target}-${Date.now()}`,
          source: params.source,
          target: params.target,
          sourceHandle: params.sourceHandle || null,
          targetHandle: params.targetHandle || null,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#3b82f6',
          },
        }
        
        setEdges((eds) => addEdge(newEdge, eds))
      }
    },
    [nodes]
  )

  // Delete selected nodes and edges
  const deleteSelected = useCallback(() => {
    // Filter out selected nodes
    const newNodes = nodes.filter(node => !selectedNodes.includes(node.id))
    // Filter out edges connected to deleted nodes or selected edges
    const newEdges = edges.filter(edge => 
      !selectedEdges.includes(edge.id) &&
      newNodes.some(n => n.id === edge.source) &&
      newNodes.some(n => n.id === edge.target)
    )
    
    setNodes(newNodes)
    setEdges(newEdges)
    setSelectedNodes([])
    setSelectedEdges([])
    
    if (selectedNodes.length > 0 || selectedEdges.length > 0) {
      toast.success(`Deleted ${selectedNodes.length} node(s) and ${selectedEdges.length} connection(s)`)
    }
  }, [nodes, edges, selectedNodes, selectedEdges])

  // Handle node selection
  useOnSelectionChange({
    onChange: ({ nodes, edges }) => {
      setSelectedNodes(nodes.map(node => node.id))
      setSelectedEdges(edges.map(edge => edge.id))
      if (nodes.length === 1) {
        setSelectedNode(nodes[0] as WorkflowNode)
      } else {
        setSelectedNode(null)
      }
    },
  })

  // Start node drag
  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
    setDraggingNodeType(nodeType)
  }

  // Add node from library
  const handleAddNode = (nodeType: string) => {
    const [type, subtype] = nodeType.split(':')
    const newNodeId = `${type}-${uuidv4()}`
    
    let nodeData: WorkflowNodeData = { 
      label: `${subtype.replace('_', ' ')} Node`,
      type: subtype,
      config: getDefaultConfig(subtype)
    }
    
    // Add LinkedIn-specific configurations
    if (subtype === 'linkedin_account') {
      nodeData.label = 'LinkedIn Account'
      nodeData.config = {
        accountId: '',
        name: 'My LinkedIn Account',
        cookies: '',
        isActive: true
      }
    }
    
    const newNode: WorkflowNode = {
      id: newNodeId,
      type: type as any,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: nodeData
    }
    
    setNodes(nds => [...nds, newNode])
    
    // Auto-connect if there's a selected node
    if (selectedNode && selectedNode.id) {
      const newEdge: Edge = {
        id: `edge-${selectedNode.id}-${newNodeId}`,
        source: selectedNode.id,
        target: newNodeId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#3b82f6',
        },
      }
      setEdges(eds => [...eds, newEdge])
    }
    
    toast.success(`Added ${nodeData.label}`)
  }

  // Save workflow to Supabase
  const saveWorkflow = async () => {
    if (!workflowName.trim()) {
      toast.error('Please enter a workflow name')
      return
    }

    try {
      setIsSaving(true)
      setSaveError(null)
      
      const workflowData: any = {
        name: workflowName,
        description: workflowDescription,
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type,
          animated: edge.animated,
          style: edge.style,
          markerEnd: edge.markerEnd
        })),
        node_count: nodes.length,
        edge_count: edges.length,
        updated_at: new Date().toISOString()
      }

      console.log('Saving workflow data:', workflowData)

      let response: any
      
      if (workflowId) {
        // Update existing workflow
        workflowData.id = workflowId
        response = await supabase
          .from('workflows')
          .update(workflowData)
          .eq('id', workflowId)
          .select()
      } else {
        // Create new workflow
        const { data: user } = await supabase.auth.getUser()
        if (!user.user) {
          throw new Error('User not authenticated')
        }
        
        workflowData.user_id = user.user.id
        workflowData.status = 'draft'
        
        response = await supabase
          .from('workflows')
          .insert([workflowData])
          .select()
      }

      const { data, error } = response

      if (error) {
        console.error('Error saving workflow:', error)
        setSaveError(error.message)
        throw error
      }

      const savedWorkflow = data?.[0]
      
      toast.success(workflowId ? 'Workflow updated successfully!' : 'Workflow saved successfully!')
      
      // If this was a new workflow, redirect to the saved workflow
      if (!workflowId && savedWorkflow) {
        router.push(`/dashboard/automation/workflow/${savedWorkflow.id}`)
      }
      
    } catch (error: any) {
      console.error('Error saving workflow:', error)
      toast.error(error.message || 'Failed to save workflow')
    } finally {
      setIsSaving(false)
    }
  }

  // Execute workflow
  const executeWorkflow = async () => {
    setIsExecuting(true)
    
    try {
      // Validate workflow
      if (nodes.length === 0) {
        throw new Error('Workflow has no nodes')
      }

      // Check if LinkedIn account is configured
      const linkedinAccountNode = nodes.find(node => node.data.type === 'linkedin_account')
      if (!linkedinAccountNode) {
        throw new Error('No LinkedIn account configured. Please add a LinkedIn account node.')
      }

      // Check if LinkedIn account has valid configuration
      if (!linkedinAccountNode.data.config?.name || !linkedinAccountNode.data.config?.cookies) {
        throw new Error('LinkedIn account not properly configured. Please add account name and cookies.')
      }

      // First, save the workflow if needed
      if (!workflowId) {
        await saveWorkflow()
        return
      }

      // Create execution record
      const { data: execution, error: executionError } = await supabase
        .from('workflow_executions')
        .insert([{
          workflow_id: workflowId,
          workflow_name: workflowName,
          status: 'running',
          started_at: new Date().toISOString(),
          config: { 
            workflow_data: {
              nodes: nodes,
              edges: edges
            }
          }
        }])
        .select()
        .single()

      if (executionError) throw executionError

      // Build execution data
      const executionData = {
        executionId: execution.id,
        workflowId: workflowId,
        workflowName: workflowName,
        nodes: nodes,
        edges: edges,
        linkedinAccount: linkedinAccountNode.data.config,
        timestamp: new Date().toISOString(),
        config: {
          executionMode: 'test', // Change to 'live' for real execution
          maxConnectionsPerDay: linkedinAccountNode.data.config.dailyLimit || 50
        }
      }
      
      // Call API to execute workflow
      const response = await fetch('/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(executionData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Execution failed')
      }
      
      const result = await response.json()
      
      toast.success(`Workflow execution started! Execution ID: ${execution.id}`)
      
      // Update execution status
      await supabase
        .from('workflow_executions')
        .update({ 
          results: result,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', execution.id)
      
    } catch (error: any) {
      console.error('Error executing workflow:', error)
      toast.error(error.message || 'Failed to execute workflow')
    } finally {
      setIsExecuting(false)
    }
  }

  // Import/Export functions
  const exportWorkflow = () => {
    const workflow = { 
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data
      })), 
      edges, 
      name: workflowName, 
      description: workflowDescription,
      version: '1.0',
      exportDate: new Date().toISOString()
    }
    const dataStr = JSON.stringify(workflow, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `${workflowName.replace(/\s+/g, '_')}_workflow.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const importWorkflow = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)
        setNodes(importedData.nodes || [])
        setEdges(importedData.edges || [])
        setWorkflowName(importedData.name || 'Imported Workflow')
        setWorkflowDescription(importedData.description || '')
        
        toast.success('Workflow imported successfully!')
      } catch (error) {
        toast.error('Invalid workflow file')
      }
    }
    reader.readAsText(file)
  }

  const handleNodeConfigUpdate = (config: any) => {
    if (!selectedNode) return
    
    setNodes(nodes.map(n => 
      n.id === selectedNode.id 
        ? { 
            ...n, 
            data: { 
              ...n.data, 
              config: { ...n.data.config, ...config }
            }
          }
        : n
    ))
    
    setSelectedNode(null)
    toast.success('Node configuration updated')
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        saveWorkflow()
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        deleteSelected()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveWorkflow, deleteSelected])

  if (isLoading) {
    return (
      <div className="h-[700px] flex items-center justify-center border border-gray-200 rounded-xl bg-white">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workflow...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[700px] flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-lg font-semibold bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Workflow Name"
            />
            <input
              type="text"
              value={workflowDescription}
              onChange={(e) => setWorkflowDescription(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-64 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Workflow description"
            />
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Zap className="h-4 w-4 text-yellow-500" />
              {nodes.length} nodes
            </span>
            <span className="flex items-center gap-1">
              <LinkIcon className="h-4 w-4 text-blue-500" />
              {edges.length} connections
            </span>
            {workflowId && (
              <span className="text-xs text-gray-500">
                ID: {workflowId.slice(0, 8)}...
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowNodePanel(!showNodePanel)}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors"
          >
            {showNodePanel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showNodePanel ? 'Hide Nodes' : 'Show Nodes'}
          </button>
          
          <button
            onClick={deleteSelected}
            disabled={selectedNodes.length === 0 && selectedEdges.length === 0}
            className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            title="Delete selected (Del)"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
          
          <button
            onClick={executeWorkflow}
            disabled={isExecuting || nodes.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-all"
          >
            {isExecuting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <Play className="h-4 w-4" />
            )}
            Execute
          </button>
          
          <button
            onClick={saveWorkflow}
            disabled={isSaving}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-all"
          >
            {isSaving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            {workflowId ? 'Update' : 'Save'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {saveError && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 animate-in fade-in">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h4 className="font-medium text-red-800">Error Saving Workflow</h4>
          </div>
          <p className="text-red-700 text-sm">{saveError}</p>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Node Library */}
        <NodeLibraryPanel 
          isOpen={showNodePanel}
          onDragStart={handleDragStart}
          draggingNodeType={draggingNodeType}
          onAddNode={handleAddNode} // Fixed: Now accepts just nodeType
        />

        {/* ReactFlow Canvas */}
        <div 
          ref={flowContainerRef}
          className="flex-1 relative"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            connectionMode={ConnectionMode.Loose}
            fitView
            onNodeClick={(event, node) => setSelectedNode(node as WorkflowNode)}
            selectionMode={SelectionMode.Partial}
            deleteKeyCode={['Delete', 'Backspace']}
            selectionOnDrag
            panOnDrag={[1, 2]}
            panOnScroll
            zoomOnScroll
            zoomOnPinch
            nodesDraggable
            nodesConnectable
            edgesFocusable
            elementsSelectable
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#3b82f6', strokeWidth: 2 },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#3b82f6',
              },
            }}
            style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
            }}
          >
            <Background 
              variant={BackgroundVariant.Dots}
              gap={20} 
              size={1} 
              color="#cbd5e1"
              className="opacity-50"
            />
            <Controls 
              className="bg-white shadow-lg rounded-lg border border-gray-200 p-1"
              showInteractive={false}
            />
            <MiniMap 
              nodeStrokeWidth={3}
              nodeColor={(node) => {
                switch (node.type) {
                  case 'trigger': return '#3b82f6'
                  case 'action': return '#10b981'
                  case 'control': return '#8b5cf6'
                  case 'output': return '#ef4444'
                  default: return '#6b7280'
                }
              }}
              maskColor="rgba(255, 255, 255, 0.6)"
              className="bg-white shadow-lg border border-gray-200 rounded-lg"
            />
            <Panel position="top-right" className="space-x-2">
              <button
                onClick={exportWorkflow}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors"
                title="Export Workflow (Ctrl+E)"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <label className="px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex items-center gap-2 cursor-pointer shadow-sm transition-colors">
                <Upload className="h-4 w-4" />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={importWorkflow}
                  className="hidden"
                />
              </label>
            </Panel>
            
            {/* Drop hint */}
            {draggingNodeType && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-xl p-8 backdrop-blur-sm">
                  <div className="text-blue-600 font-semibold">Drop node here</div>
                </div>
              </div>
            )}
          </ReactFlow>

          {/* Node Configuration Panel */}
          {selectedNode && (
            <NodeConfigPanel 
              node={selectedNode}
              onUpdate={handleNodeConfigUpdate}
              onClose={() => setSelectedNode(null)}
            />
          )}

          {/* Execution Status Panel */}
          {isExecuting && (
            <div className="absolute bottom-4 left-4 bg-white border border-gray-200 rounded-xl shadow-xl p-4">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
                <div className="font-medium">Executing workflow...</div>
              </div>
              <div className="text-sm text-gray-500 mt-1">Sending LinkedIn connection requests</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Wrap with ReactFlowProvider
export default function WorkflowBuilder(props: WorkflowBuilderProps) {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderComponent {...props} />
    </ReactFlowProvider>
  )
}