"use client"

import { useState } from 'react'
import { Users, Send, Settings, LogOut, Home } from 'lucide-react'
import DashboardPage from './page'  // Your existing accounts page
import AutomationPage from './automation/page'  // Your automation page

// Remove the children prop since we're handling content ourselves
export default function DashboardLayout() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'automation'>('accounts')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Home className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">LinkedIn Dashboard</h1>
            </div>
            <div className="text-sm text-gray-500">Manage your LinkedIn accounts and automation</div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="h-5 w-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <LogOut className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex">
        {/* Left Sidebar - 20% */}
        <div className="w-1/5 min-h-[calc(100vh-73px)] bg-white border-r border-gray-200">
          {/* Tabs Navigation */}
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Navigation</h2>
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('accounts')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'accounts'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Users className="h-5 w-5" />
                <span className="font-medium">Accounts</span>
              </button>

              <button
                onClick={() => setActiveTab('automation')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'automation'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Send className="h-5 w-5" />
                <span className="font-medium">Automation</span>
              </button>
            </nav>

            {/* Quick Stats */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Accounts</span>
                  <span className="text-sm font-medium text-gray-900">0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pending Connections</span>
                  <span className="text-sm font-medium text-gray-900">0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Automation Status</span>
                  <span className="text-sm font-medium text-yellow-600">Idle</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area - 80% */}
        <div className="w-4/5 min-h-[calc(100vh-73px)] p-6 overflow-auto">
          {/* Tab Content - Render the appropriate page */}
          {activeTab === 'accounts' ? (
            <DashboardPage />
          ) : (
            <AutomationPage />
          )}
        </div>
      </div>
    </div>
  )
}