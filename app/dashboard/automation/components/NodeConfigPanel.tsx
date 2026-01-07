// app/automation/components/NodeConfigPanel.tsx
'use client'

import React, { useState } from 'react'
import { X, Save, TestTube, Globe, User } from 'lucide-react'
import { Node } from 'reactflow'
import toast from 'react-hot-toast'

// Import the WorkflowNodeData type
import { WorkflowNodeData, ScheduleType, DelayUnit, FilterField, FilterOperator, DelayType } from '../types'

// Define the WorkflowNode type locally
type WorkflowNode = Node<WorkflowNodeData>

interface NodeConfigPanelProps {
  node: WorkflowNode
  onUpdate: (config: any) => void
  onClose: () => void
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ node, onUpdate, onClose }) => {
  const [config, setConfig] = useState<Record<string, any>>(node.data.config || {})
  const [isTesting, setIsTesting] = useState(false)

  const handleSave = () => {
    onUpdate(config)
  }

  const handleTestLinkedIn = async () => {
    if (node.data.type !== 'linkedin_account') return
    
    try {
      setIsTesting(true)
      const response = await fetch('/api/linkedin/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookies: config?.cookies })
      })
      
      if (!response.ok) throw new Error('Test failed')
      
      const result = await response.json()
      toast.success(`LinkedIn account verified! Connected as ${result.name}`)
      
      setConfig(prev => ({
        ...prev,
        accountId: result.accountId,
        name: result.name,
        isActive: true
      }))
    } catch (error) {
      toast.error('Failed to verify LinkedIn account')
    } finally {
      setIsTesting(false)
    }
  }

  const renderLinkedInAccountConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Account Name
        </label>
        <input
          type="text"
          value={config.name || ''}
          onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="My LinkedIn Account"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          LinkedIn Cookies
        </label>
        <textarea
          value={config.cookies || ''}
          onChange={(e) => setConfig(prev => ({ ...prev, cookies: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          placeholder="Paste your LinkedIn session cookies here"
          rows={4}
        />
        <p className="text-xs text-gray-500 mt-1">
          Use browser developer tools to copy session cookies
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Proxy (Optional)
        </label>
        <input
          type="text"
          value={config.proxy || ''}
          onChange={(e) => setConfig(prev => ({ ...prev, proxy: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="http://user:pass@host:port"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Daily Connection Limit
        </label>
        <input
          type="number"
          value={config.dailyLimit || 50}
          onChange={(e) => setConfig(prev => ({ ...prev, dailyLimit: parseInt(e.target.value) || 50 }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          min="1"
          max="100"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            checked={config.isActive !== false}
            onChange={(e) => setConfig(prev => ({ ...prev, isActive: e.target.checked }))}
            className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
            Account Active
          </label>
        </div>
      </div>
      
      <button
        onClick={handleTestLinkedIn}
        disabled={isTesting || !config.cookies}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isTesting ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
        ) : (
          <TestTube className="h-4 w-4" />
        )}
        Test LinkedIn Connection
      </button>
    </div>
  )

  const renderSendConnectionConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Connection Message
        </label>
        <textarea
          value={config.message || ''}
          onChange={(e) => setConfig(prev => ({ ...prev, message: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Hi {{name}}, I'd like to connect with you."
          rows={3}
        />
        <p className="text-xs text-gray-500 mt-1">
          Use {'{{name}}'} to insert profile name dynamically
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Limit Per Day
          </label>
          <input
            type="number"
            value={config.limitPerDay || 3}
            onChange={(e) => setConfig(prev => ({ ...prev, limitPerDay: parseInt(e.target.value) || 3 }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="1"
            max="100"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Delay Between (seconds)
          </label>
          <input
            type="number"
            value={config.delayBetween || 30}
            onChange={(e) => setConfig(prev => ({ ...prev, delayBetween: parseInt(e.target.value) || 30 }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="10"
            max="300"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Target Audience
        </label>
        <select
          value={config.targetAudience || 'recruiters'}
          onChange={(e) => setConfig(prev => ({ ...prev, targetAudience: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="recruiters">Recruiters</option>
          <option value="founders">Startup Founders</option>
          <option value="developers">Developers</option>
          <option value="marketers">Marketers</option>
          <option value="designers">Designers</option>
          <option value="all">All Professionals</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Max Total Connections
        </label>
        <input
          type="number"
          value={config.maxConnections || 50}
          onChange={(e) => setConfig(prev => ({ ...prev, maxConnections: parseInt(e.target.value) || 50 }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          min="1"
          max="1000"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Custom Note (Optional)
        </label>
        <textarea
          value={config.customNote || ''}
          onChange={(e) => setConfig(prev => ({ ...prev, customNote: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Add a custom note to include in connection request"
          rows={2}
        />
      </div>
    </div>
  )

  const renderScheduleConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Schedule Type
        </label>
        <select
          value={config.scheduleType || 'daily'}
          onChange={(e) => setConfig(prev => ({ ...prev, scheduleType: e.target.value as ScheduleType }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="cron">Custom Cron</option>
        </select>
      </div>
      
      {config.scheduleType === 'daily' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time
          </label>
          <input
            type="time"
            value={config.time || '09:00'}
            onChange={(e) => setConfig(prev => ({ ...prev, time: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}
      
      {config.scheduleType === 'weekly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Days of Week
          </label>
          <div className="flex flex-wrap gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
              const dayNumber = index + 1
              const daysOfWeek = Array.isArray(config.daysOfWeek) ? config.daysOfWeek : [1, 2, 3, 4, 5]
              const isChecked = daysOfWeek.includes(dayNumber)
              
              return (
                <label key={day} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const newDays = e.target.checked
                        ? [...daysOfWeek, dayNumber]
                        : daysOfWeek.filter((d: number) => d !== dayNumber)
                      setConfig(prev => ({ 
                        ...prev, 
                        daysOfWeek: [...new Set(newDays)].sort() 
                      }))
                    }}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-1 text-sm text-gray-700">{day}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
      
      {config.scheduleType === 'cron' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cron Expression
          </label>
          <input
            type="text"
            value={config.cronExpression || '0 9 * * *'}
            onChange={(e) => setConfig(prev => ({ ...prev, cronExpression: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
            placeholder="0 9 * * *"
          />
          <p className="text-xs text-gray-500 mt-1">
            Format: minute hour day month day-of-week
          </p>
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Timezone
        </label>
        <select
          value={config.timezone || 'UTC'}
          onChange={(e) => setConfig(prev => ({ ...prev, timezone: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="UTC">UTC</option>
          <option value="America/New_York">EST (New York)</option>
          <option value="America/Chicago">CST (Chicago)</option>
          <option value="America/Denver">MST (Denver)</option>
          <option value="America/Los_Angeles">PST (Los Angeles)</option>
          <option value="Europe/London">GMT (London)</option>
          <option value="Europe/Paris">CET (Paris)</option>
          <option value="Asia/Tokyo">JST (Tokyo)</option>
        </select>
      </div>
    </div>
  )

  const renderFilterConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Field to Filter
        </label>
        <select
          value={config.field || 'company'}
          onChange={(e) => setConfig(prev => ({ ...prev, field: e.target.value as FilterField }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="company">Company</option>
          <option value="title">Job Title</option>
          <option value="location">Location</option>
          <option value="industry">Industry</option>
          <option value="connections">Connection Count</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operator
        </label>
        <select
          value={config.operator || 'contains'}
          onChange={(e) => setConfig(prev => ({ ...prev, operator: e.target.value as FilterOperator }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="contains">Contains</option>
          <option value="equals">Equals</option>
          <option value="startsWith">Starts With</option>
          <option value="endsWith">Ends With</option>
          <option value="greaterThan">Greater Than</option>
          <option value="lessThan">Less Than</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Value
        </label>
        <input
          type="text"
          value={config.value || ''}
          onChange={(e) => setConfig(prev => ({ ...prev, value: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter filter value"
        />
      </div>
      
      <div className="flex items-center">
        <input
          type="checkbox"
          id="caseSensitive"
          checked={config.caseSensitive || false}
          onChange={(e) => setConfig(prev => ({ ...prev, caseSensitive: e.target.checked }))}
          className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
        />
        <label htmlFor="caseSensitive" className="ml-2 text-sm text-gray-700">
          Case Sensitive
        </label>
      </div>
    </div>
  )

  const renderDelayConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Duration
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={config.duration || 30}
            onChange={(e) => setConfig(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="1"
          />
          <select
            value={config.unit || 'minutes'}
            onChange={(e) => setConfig(prev => ({ ...prev, unit: e.target.value as DelayUnit }))}
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="seconds">Seconds</option>
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Delay Type
        </label>
        <select
          value={config.delayType || 'fixed'}
          onChange={(e) => setConfig(prev => ({ ...prev, delayType: e.target.value as DelayType }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="fixed">Fixed Delay</option>
          <option value="random">Random Delay</option>
          <option value="exponential">Exponential Backoff</option>
        </select>
      </div>
      
      {config.delayType === 'random' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Maximum Duration
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={config.maxDuration || 60}
              onChange={(e) => setConfig(prev => ({ ...prev, maxDuration: parseInt(e.target.value) || 60 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
            />
            <select
              value={config.maxUnit || 'minutes'}
              onChange={(e) => setConfig(prev => ({ ...prev, maxUnit: e.target.value as DelayUnit }))}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="seconds">Seconds</option>
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )

  const renderWebhookConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Webhook URL
        </label>
        <input
          type="text"
          value={config.url || ''}
          onChange={(e) => setConfig(prev => ({ ...prev, url: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          placeholder="https://example.com/webhook"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          HTTP Method
        </label>
        <select
          value={config.method || 'POST'}
          onChange={(e) => setConfig(prev => ({ ...prev, method: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Retry Count
        </label>
        <input
          type="number"
          value={config.retryCount || 3}
          onChange={(e) => setConfig(prev => ({ ...prev, retryCount: parseInt(e.target.value) || 3 }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          min="0"
          max="10"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Headers (JSON format)
        </label>
        <textarea
          value={config.headers ? JSON.stringify(config.headers, null, 2) : '{}'}
          onChange={(e) => {
            try {
              const headers = JSON.parse(e.target.value || '{}')
              setConfig(prev => ({ ...prev, headers }))
            } catch (error) {
              // Keep invalid JSON as string for user to fix
              setConfig(prev => ({ ...prev, headers: e.target.value }))
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          rows={4}
          placeholder='{"Content-Type": "application/json", "Authorization": "Bearer token"}'
        />
        <p className="text-xs text-gray-500 mt-1">
          Enter headers as valid JSON
        </p>
      </div>
    </div>
  )

  const renderDefaultConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Node Label
        </label>
        <input
          type="text"
          value={config.label || node.data.label || ''}
          onChange={(e) => setConfig(prev => ({ ...prev, label: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      {Object.keys(config).map((key) => {
        const value = config[key]
        if (typeof value === 'string' || typeof value === 'number') {
          return (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
              </label>
              <input
                type={typeof value === 'number' ? 'number' : 'text'}
                value={value}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  [key]: typeof value === 'number' ? parseInt(e.target.value) || 0 : e.target.value 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )
        }
        if (typeof value === 'boolean') {
          return (
            <div key={key} className="flex items-center">
              <input
                type="checkbox"
                id={key}
                checked={value}
                onChange={(e) => setConfig(prev => ({ ...prev, [key]: e.target.checked }))}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor={key} className="ml-2 text-sm text-gray-700">
                {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
              </label>
            </div>
          )
        }
        return null
      })}
    </div>
  )

  const getConfigForm = () => {
    switch (node.data.type) {
      case 'linkedin_account':
        return renderLinkedInAccountConfig()
      case 'send_connection':
        return renderSendConnectionConfig()
      case 'schedule':
        return renderScheduleConfig()
      case 'filter':
        return renderFilterConfig()
      case 'delay':
        return renderDelayConfig()
      case 'webhook':
      case 'webhook_out':
        return renderWebhookConfig()
      default:
        return renderDefaultConfig()
    }
  }

  return (
    <div className="absolute right-4 top-20 w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-gray-900">Configure Node</h3>
            <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
              {node.data.type === 'linkedin_account' && <Globe className="h-3 w-3" />}
              {node.data.type === 'send_connection' && <User className="h-3 w-3" />}
              {node.data.type === 'schedule' && (
                <svg 
                  className="h-3 w-3 text-blue-500" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  aria-label="Schedule icon"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                  />
                </svg>
              )}
              {node.data.label}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close configuration panel"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
      </div>
      
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {getConfigForm()}
      </div>
      
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <button
          onClick={handleSave}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm"
        >
          <Save className="h-4 w-4" />
          Save Configuration
        </button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Press Ctrl+S to save workflow
        </p>
      </div>
    </div>
  )
}

export default NodeConfigPanel