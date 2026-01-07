'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/ClientProvider'
import toast from 'react-hot-toast'
import {
  Users,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
  Calendar,
  BarChart,
  Settings,
  Zap
} from 'lucide-react'

// Define types for better TypeScript support
interface LinkedInAccount {
  id: number // Changed from string to number (BIGSERIAL)
  installation_id: string // ADD THIS LINE
  dashboard_user_id: string
  name: string
  company?: string
  last_synced?: string
  is_active: boolean
  status: string
  has_li_at: boolean
  cookie_count: number
  profile_url: string
  // Add other fields as needed
}

interface ConnectionProfile {
  id: number // Changed from string to number (BIGSERIAL)
  name: string
  company?: string
  headline?: string
  location?: string
  status: string
  profile_url: string
  connection_note?: string
  // Add other fields as needed
}

export default function AutomationPage() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([])
  const [automationStatus, setAutomationStatus] = useState<'idle' | 'running' | 'paused'>('idle')
  const [queueStats, setQueueStats] = useState({
    pending: 0,
    sentToday: 0,
    totalSent: 0,
    successRate: 0
  })
  const [loading, setLoading] = useState({
    accounts: false,
    profiles: false,
    stats: false
  })

  // Fetch connected accounts
  useEffect(() => {
    if (user) {
      fetchAccounts()
      fetchProfiles()
      fetchQueueStats()
    }
  }, [user])

  const fetchAccounts = async () => {
    setLoading(prev => ({ ...prev, accounts: true }))
    try {
      const { data, error } = await supabase
        .from('linkedin_accounts_new')
        .select('*')
        .eq('dashboard_user_id', user?.id)
        .eq('is_active', true)
        .order('last_synced', { ascending: false })
      
      if (error) {
        console.error('Error fetching accounts:', error)
        toast.error('Failed to load accounts')
        setAccounts([])
        return
      }
      
      // FIX: Handle null/undefined data
      const accountsData: LinkedInAccount[] = data || []
      setAccounts(accountsData)
      
      // Only set selected account if we have accounts
      if (accountsData.length > 0 && !selectedAccount) {
        setSelectedAccount(accountsData[0].id.toString())
      }
    } catch (error) {
      console.error('Error:', error)
      setAccounts([])
    } finally {
      setLoading(prev => ({ ...prev, accounts: false }))
    }
  }

  const fetchProfiles = async () => {
    setLoading(prev => ({ ...prev, profiles: true }))
    try {
      const { data, error } = await supabase
        .from('connection_profiles')
        .select('*')
        .eq('dashboard_user_id', user?.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) {
        console.error('Error fetching profiles:', error)
        toast.error('Failed to load profiles')
        setProfiles([])
        return
      }
      
      // FIX: Handle null/undefined data
      setProfiles(data || [])
    } catch (error) {
      console.error('Error:', error)
      setProfiles([])
    } finally {
      setLoading(prev => ({ ...prev, profiles: false }))
    }
  }

  const fetchQueueStats = async () => {
    setLoading(prev => ({ ...prev, stats: true }))
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get sent today - FIXED: Added proper error handling
      const { count: sentToday, error: sentError } = await supabase
        .from('automation_queue')
        .select('*', { count: 'exact', head: true })
        .eq('dashboard_user_id', user?.id)
        .eq('status', 'completed')
        .gte('created_at', `${today}T00:00:00`)
      
      if (sentError) {
        console.error('Error fetching sent today:', sentError)
      }
      
      // Get pending - FIXED: Added proper error handling
      const { count: pending, error: pendingError } = await supabase
        .from('automation_queue')
        .select('*', { count: 'exact', head: true })
        .eq('dashboard_user_id', user?.id)
        .eq('status', 'pending')
      
      if (pendingError) {
        console.error('Error fetching pending:', pendingError)
      }
      
      setQueueStats({
        pending: pending || 0,
        sentToday: sentToday || 0,
        totalSent: 0,
        successRate: 85
      })
    } catch (error) {
      console.error('Error fetching queue stats:', error)
    } finally {
      setLoading(prev => ({ ...prev, stats: false }))
    }
  }

  // Start Automation - FIXED: Updated for new schema
  const startAutomation = async () => {
    if (!selectedAccount) {
      toast.error('Please select a LinkedIn account')
      return
    }

    if (queueStats.sentToday >= 3) {
      toast.error('Daily limit reached (3 connections per day)')
      return
    }

    // Get selected account details
    const selectedAccountData = accounts.find(acc => acc.id.toString() === selectedAccount)
    if (!selectedAccountData) {
      toast.error('Selected account not found')
      return
    }

    // Get 3 pending profiles
    const { data: pendingProfiles, error: profilesError } = await supabase
      .from('connection_profiles')
      .select('*')
      .eq('dashboard_user_id', user?.id)
      .eq('status', 'pending')
      .limit(3)

    if (profilesError) {
      toast.error('Failed to load profiles')
      return
    }

    // FIX: Check if data is null/empty
    if (!pendingProfiles || pendingProfiles.length === 0) {
      toast.error('No profiles available for connection')
      return
    }

    // Now we can access installation_id from selectedAccountData
    const installationId = selectedAccountData.installation_id

    // Add to queue with 30-minute intervals
    const queueItems = pendingProfiles.map((profile, index) => ({
      installation_id: installationId,
      dashboard_user_id: user?.id,
      account_id: selectedAccount,
      profile_id: profile.id,
      status: 'pending',
      scheduled_time: new Date(Date.now() + (index * 30 * 60 * 1000)).toISOString(), // 30 min intervals
      profile_url: profile.profile_url,
      connection_note: profile.connection_note || 'Hi, I\'d like to connect with you'
    }))

    const { error: queueError } = await supabase
      .from('automation_queue')
      .insert(queueItems)

    if (queueError) {
      console.error('Queue error:', queueError)
      toast.error('Failed to start automation')
      return
    }

    // Start the automation worker
    try {
      const response = await fetch('/api/automation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccount,
          installationId: installationId,
          dashboardUserId: user?.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Failed to start automation')
        return
      }

      setAutomationStatus('running')
      toast.success('Automation started! Sending 3 connections with 30-minute intervals')
      
      // Refresh data
      fetchQueueStats()
      fetchProfiles()
      
    } catch (error) {
      console.error('Error starting automation:', error)
      toast.error('Failed to start automation')
    }
  }

  // Pause Automation
  const pauseAutomation = async () => {
    try {
      // Find installation_id from selected account
      const selectedAccountData = accounts.find(acc => acc.id.toString() === selectedAccount)
      
      if (!selectedAccountData) {
        toast.error('Selected account not found')
        return
      }

      const response = await fetch('/api/automation/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.id,
          installationId: selectedAccountData.installation_id 
        })
      })

      if (!response.ok) {
        toast.error('Failed to pause automation')
        return
      }

      setAutomationStatus('paused')
      toast.success('Automation paused')
    } catch (error) {
      console.error('Error pausing automation:', error)
      toast.error('Failed to pause automation')
    }
  }

  // Refresh all data
  const refreshAll = async () => {
    await Promise.all([
      fetchAccounts(),
      fetchProfiles(),
      fetchQueueStats()
    ])
    toast.success('Data refreshed')
  }

  // Helper function to get account display name
  const getAccountDisplayName = (account: LinkedInAccount) => {
    if (account.company) {
      return `${account.name} - ${account.company}`
    }
    return account.name
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">LinkedIn Automation</h1>
            <p className="text-purple-100">Send connection requests automatically</p>
          </div>
          <Zap className="h-12 w-12 opacity-80" />
        </div>
      </div>

      {/* Loading State */}
      {(loading.accounts || loading.profiles || loading.stats) && (
        <div className="bg-white rounded-xl shadow p-4 flex items-center justify-center">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          <span>Loading data...</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold">{queueStats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sent Today</p>
              <p className="text-2xl font-bold">
                {queueStats.sentToday}/3
                {queueStats.sentToday >= 3 && (
                  <span className="text-xs text-red-600 ml-2">Limit reached</span>
                )}
              </p>
            </div>
            <Send className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold">{queueStats.successRate}%</p>
            </div>
            <BarChart className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className={`text-lg font-bold ${
                automationStatus === 'running' ? 'text-green-600' :
                automationStatus === 'paused' ? 'text-yellow-600' :
                'text-gray-600'
              }`}>
                {automationStatus === 'running' ? 'Running' :
                 automationStatus === 'paused' ? 'Paused' : 'Idle'}
              </p>
            </div>
            {automationStatus === 'running' ? (
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
            ) : (
              <Settings className="h-8 w-8 text-gray-500" />
            )}
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">Automation Control</h2>
        
        {/* Account Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select LinkedIn Account
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            disabled={accounts.length === 0 || loading.accounts}
          >
            <option value="">Choose an account</option>
            {accounts.length === 0 ? (
              <option value="" disabled>No connected accounts found</option>
            ) : (
              accounts.map(account => (
                <option key={account.id} value={account.id.toString()}>
                  {getAccountDisplayName(account)}
                </option>
              ))
            )}
          </select>
          
          {/* Account details */}
          {selectedAccount && (
            <div className="mt-2 text-sm text-gray-600">
              {(() => {
                const account = accounts.find(acc => acc.id.toString() === selectedAccount)
                if (!account) return null
                
                return (
                  <div className="flex flex-col space-y-1">
                    <span>Session: {account.has_li_at ? '✅ Active' : '❌ Expired'}</span>
                    <span>Cookies: {account.cookie_count}</span>
                    <span>Last synced: {account.last_synced ? new Date(account.last_synced).toLocaleString() : 'Never'}</span>
                  </div>
                )
              })()}
            </div>
          )}
          
          {accounts.length === 0 && !loading.accounts && (
            <p className="text-sm text-red-600 mt-2">
              No LinkedIn accounts connected. Please connect an account first.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={startAutomation}
            disabled={automationStatus === 'running' || !selectedAccount || queueStats.sentToday >= 3 || accounts.length === 0}
            className={`flex-1 py-3 px-6 rounded-lg font-medium flex items-center justify-center ${
              automationStatus === 'running' || !selectedAccount || queueStats.sentToday >= 3 || accounts.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <Play className="h-5 w-5 mr-2" />
            {queueStats.sentToday >= 3 ? 'Daily Limit Reached' : 'Start Automation'}
          </button>
          
          <button
            onClick={pauseAutomation}
            disabled={automationStatus !== 'running'}
            className={`flex-1 py-3 px-6 rounded-lg font-medium flex items-center justify-center ${
              automationStatus !== 'running'
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            }`}
          >
            <Pause className="h-5 w-5 mr-2" />
            Pause
          </button>
          
          <button
            onClick={refreshAll}
            disabled={loading.accounts || loading.profiles || loading.stats}
            className="flex-1 py-3 px-6 rounded-lg font-medium flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${(loading.accounts || loading.profiles || loading.stats) ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            <strong>Note:</strong> Sends 3 connection requests per day with 30-minute intervals between each request.
          </p>
        </div>
      </div>

      {/* Profiles List */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Available Profiles ({profiles.length})</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{queueStats.sentToday} sent today</span>
            <button
              onClick={fetchProfiles}
              disabled={loading.profiles}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
          </div>
        </div>
        
        {profiles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No profiles available for connection</p>
            <p className="text-sm mt-2">Add profiles to the connection_profiles table</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.slice(0, 6).map(profile => (
              <div key={profile.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mr-3 flex items-center justify-center text-white font-bold">
                    {profile.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{profile.name}</p>
                    <p className="text-sm text-gray-600">{profile.company || 'No company'}</p>
                  </div>
                </div>
                {profile.headline && (
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">{profile.headline}</p>
                )}
                <div className="flex justify-between items-center">
                  {profile.location && (
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                      {profile.location}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded ${
                    profile.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    profile.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                    profile.status === 'accepted' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {profile.status}
                  </span>
                </div>
                {profile.profile_url && (
                  <div className="mt-3">
                    <a 
                      href={profile.profile_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      View Profile →
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {profiles.length > 6 && (
          <div className="mt-4 text-center">
            <button className="text-sm text-blue-600 hover:text-blue-800">
              View all {profiles.length} profiles →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}