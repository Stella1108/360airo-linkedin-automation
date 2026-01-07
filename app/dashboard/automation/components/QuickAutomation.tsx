// app/dashboard/automation/components/QuickAutomation.tsx 
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import {
  Users, Send, Clock, CheckCircle, Loader2,
  ExternalLink, Target, AlertTriangle, Play, Globe,
  XCircle, ChevronDown, ChevronUp, Filter, RefreshCw,
  Database, Eye, CheckCheck, Mail, Chrome, MoveRight,
  MousePointer, Search, Zap, Server
} from 'lucide-react'

interface QuickAutomationProps {
  onWorkflowCreated?: () => void
}

interface LinkedInAccountNew {
  id: number
  name: string
  headline: string | null
  is_active: boolean
  has_li_at: boolean
  profile_image_url: string | null
  profile_url: string | null
  last_synced: string | null
  daily_limit: number
  installation_id: string
  dashboard_user_id: string
}

interface LinkedInSession {
  id: number
  account_id: number
  li_at_cookie: string
  has_li_at: boolean
  is_active: boolean
  created_at: string
  installation_id: string
}

interface ProfileToConnect {
  id: string
  name: string
  linkedin_profile_url: string
  headline?: string
}

interface AutomationLog {
  id: number
  account_id: number
  profile_url: string
  profile_name: string
  status: 'pending' | 'processing' | 'sent' | 'failed'
  error_message?: string
  created_at: string
  completed_at?: string
}

// Use Next.js API route instead of separate server
const API_BASE_URL = typeof window !== 'undefined' ? window.location.origin : ''

export default function QuickAutomation({ onWorkflowCreated }: QuickAutomationProps) {
  const [accounts, setAccounts] = useState<LinkedInAccountNew[]>([])
  const [sessions, setSessions] = useState<Record<number, LinkedInSession>>({})
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null)
  const [availableProfiles, setAvailableProfiles] = useState<ProfileToConnect[]>([])
  const [selectedProfiles, setSelectedProfiles] = useState<ProfileToConnect[]>([])
  const [automationLogs, setAutomationLogs] = useState<AutomationLog[]>([])
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false)
  const [connectionNote, setConnectionNote] = useState('Hi, I\'d like to connect with you.')
  const [searchTerm, setSearchTerm] = useState('')
  
  const [activeAutomation, setActiveAutomation] = useState<{
    isRunning: boolean
    currentProfileIndex: number
    totalProfiles: number
    currentStep: string
  }>({
    isRunning: false,
    currentProfileIndex: 0,
    totalProfiles: 0,
    currentStep: 'idle'
  })
  
  const [serverStatus, setServerStatus] = useState({
    isOnline: false,
    loading: false
  })
  
  const [loading, setLoading] = useState({
    accounts: false,
    profiles: false,
    logs: false,
    automation: false
  })

  // Fetch data on mount
  useEffect(() => {
    checkServerStatus()
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    await Promise.all([
      fetchAccounts(),
      fetchAvailableProfiles(),
      fetchAutomationLogs()
    ])
  }

  // Check server status (now checks Next.js API)
  const checkServerStatus = async () => {
    setServerStatus(prev => ({ ...prev, loading: true }))
    try {
      console.log('Checking Next.js API route status...')
      
      const response = await fetch('/api/automation?action=health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      console.log('API route status response:', response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log('API health data:', data)
        setServerStatus({
          isOnline: true,
          loading: false
        })
        console.log('✅ Next.js API route is online')
        toast.success('Connected to automation API')
      } else {
        console.error('API route not responding:', response.status)
        setServerStatus({
          isOnline: false,
          loading: false
        })
      }
    } catch (error: any) {
      console.error('❌ API route is offline:', error.message)
      setServerStatus({
        isOnline: false,
        loading: false
      })
      toast.error('Automation API is not available')
    }
  }

  // Fetch accounts with sessions
  const fetchAccounts = async () => {
    setLoading(prev => ({ ...prev, accounts: true }))
    try {
      console.log('Fetching LinkedIn accounts...')
      
      const { data: accountsData, error } = await supabase
        .from('linkedin_accounts_new')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      console.log('Accounts fetch response:', { 
        dataLength: accountsData?.length, 
        error
      })

      if (error) {
        console.error('Supabase accounts error:', error)
        throw new Error(`Failed to load LinkedIn accounts: ${error.message}`)
      }
      
      setAccounts(accountsData || [])

      if (accountsData?.length) {
        const accountIds = accountsData.map(acc => acc.id)
        console.log('Fetching sessions for account IDs:', accountIds)
        
        const { data: sessionsData } = await supabase
          .from('linkedin_sessions_new')
          .select('*')
          .in('account_id', accountIds)
          .eq('is_active', true)
          .eq('has_li_at', true)

        const sessionMap: Record<number, LinkedInSession> = {}
        sessionsData?.forEach((session: LinkedInSession) => {
          sessionMap[session.account_id] = session
        })
        setSessions(sessionMap)

        if (!selectedAccount && accountsData.length > 0) {
          const accountWithSession = accountsData.find((acc: LinkedInAccountNew) => sessionMap[acc.id])
          if (accountWithSession) {
            console.log('Auto-selecting account with session:', accountWithSession.id)
            setSelectedAccount(accountWithSession.id)
          } else if (accountsData.length > 0) {
            console.log('No account with session found, selecting first account:', accountsData[0].id)
            setSelectedAccount(accountsData[0].id)
          }
        }
      } else {
        console.log('No active LinkedIn accounts found')
      }
    } catch (error: any) {
      console.error('Error fetching accounts:', error)
      toast.error('Failed to load LinkedIn accounts: ' + error.message)
    } finally {
      setLoading(prev => ({ ...prev, accounts: false }))
    }
  }

  // Fetch available profiles
  const fetchAvailableProfiles = async () => {
    setLoading(prev => ({ ...prev, profiles: true }))
    try {
      console.log('Fetching profiles from connection_sample table...')
      
      const { data, error } = await supabase
        .from('connection_sample')
        .select('*')
        .limit(50)

      console.log('Profile fetch response:', { 
        dataLength: data?.length, 
        error
      })

      if (error) {
        throw new Error(`Failed to load profiles: ${error.message}`)
      }

      const transformedData: ProfileToConnect[] = (data || []).map((profile: any) => ({
        id: profile.id?.toString() || Math.random().toString(),
        name: profile.name || 'Unknown Profile',
        linkedin_profile_url: profile.linkedin_profile_url || '',
        headline: profile.headline
      }))
      
      setAvailableProfiles(transformedData)
    } catch (error: any) {
      console.error('Error fetching profiles:', error)
      toast.error('Failed to load profiles: ' + error.message)
    } finally {
      setLoading(prev => ({ ...prev, profiles: false }))
    }
  }

  // Fetch automation logs
  const fetchAutomationLogs = async () => {
    setLoading(prev => ({ ...prev, logs: true }))
    try {
      console.log('Fetching automation logs...')
      
      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.log('Could not load logs, continuing without logs')
        setAutomationLogs([])
        return
      }
      
      setAutomationLogs(data || [])
    } catch (error: any) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(prev => ({ ...prev, logs: false }))
    }
  }

  // Start automation using Next.js API
  const startBrowserAutomation = async () => {
    if (!selectedAccount) {
      toast.error('Please select a LinkedIn account first')
      return
    }

    if (selectedProfiles.length === 0) {
      toast.error('Please select at least one profile to connect with')
      return
    }

    const account = getSelectedAccountData()
    const session = getAccountSession(selectedAccount)
    
    console.log('Starting automation with:', {
      account: account?.name,
      sessionExists: !!session,
      hasCookie: session?.li_at_cookie,
      profilesCount: selectedProfiles.length
    })
    
    if (!account) {
      toast.error('Selected account not found')
      return
    }

    if (!session || !session.li_at_cookie) {
      toast.error('Account needs valid LinkedIn cookie for automation. Please add li_at cookie first.')
      return
    }

    if (!serverStatus.isOnline) {
      toast.error('Automation API is offline. Please refresh the page.')
      return
    }

    setActiveAutomation({
      isRunning: true,
      currentProfileIndex: 0,
      totalProfiles: selectedProfiles.length,
      currentStep: 'Initializing automation...'
    })

    setLoading(prev => ({ ...prev, automation: true }))

    try {
      // Create automation logs for each profile
      const logEntries = selectedProfiles.map(profile => ({
        account_id: account.id,
        profile_url: profile.linkedin_profile_url,
        profile_name: profile.name,
        status: 'pending' as const,
        created_at: new Date().toISOString()
      }))

      console.log('Creating log entries:', logEntries.length)
      
      const { data: logs, error: logError } = await supabase
        .from('automation_logs')
        .insert(logEntries)
        .select()

      if (logError) {
        console.error('Error creating logs:', logError)
        // Try with simpler structure
        const simpleLogEntries = selectedProfiles.map(profile => ({
          account_id: account.id,
          profile_url: profile.linkedin_profile_url,
          profile_name: profile.name,
          status: 'pending'
        }))

        const { data: simpleLogs, error: simpleError } = await supabase
          .from('automation_logs')
          .insert(simpleLogEntries)
          .select()

        if (simpleError) {
          console.error('Simple log creation failed:', simpleError)
          throw new Error(`Failed to create logs: ${simpleError.message}`)
        }
        
        const newLogs = simpleLogs || []
        if (newLogs.length > 0) {
          await startApiAutomation(account, session, newLogs[0], 0, newLogs)
        } else {
          throw new Error('No logs were created')
        }
      } else {
        const newLogs = logs || []
        if (newLogs.length > 0) {
          await startApiAutomation(account, session, newLogs[0], 0, newLogs)
        } else {
          throw new Error('No logs were created')
        }
      }
      
    } catch (error: any) {
      console.error('Automation startup error:', error)
      toast.error('Failed to start automation: ' + error.message)
      stopAutomation()
    } finally {
      setLoading(prev => ({ ...prev, automation: false }))
    }
  }

  // NEW: Call Next.js API for automation
  const startApiAutomation = async (
    account: LinkedInAccountNew,
    session: LinkedInSession,
    log: AutomationLog,
    index: number,
    allLogs: AutomationLog[]
  ) => {
    try {
      console.log(`Starting automation for profile ${index + 1}/${allLogs.length}:`, log.profile_name)
      
      // Update log to processing
      await supabase
        .from('automation_logs')
        .update({ 
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', log.id)

      setActiveAutomation(prev => ({
        ...prev,
        currentProfileIndex: index + 1,
        currentStep: `Connecting to ${log.profile_name}...`
      }))

      // Call Next.js API route instead of Express server
      console.log('Calling Next.js automation API...')
      const response = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: account.id,
          profile_url: log.profile_url,
          connection_note: connectionNote
          // li_at_cookie is automatically fetched by the API from sessions table
        })
      })

      console.log('API response status:', response.status, response.statusText)
      
      let result
      try {
        result = await response.json()
        console.log('API response data:', result)
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError)
        const textResponse = await response.text().catch(() => 'No response text')
        console.log('Response text:', textResponse)
        throw new Error(`Server returned invalid JSON: ${textResponse}`)
      }

      if (response.ok && result.success) {
        // Update log as sent
        await supabase
          .from('automation_logs')
          .update({ 
            status: 'sent',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', log.id)

        toast.success(`✅ Connected with ${log.profile_name}!`)
        setActiveAutomation(prev => ({
          ...prev,
          currentStep: `Successfully connected with ${log.profile_name}!`
        }))
        
        // Wait 30 seconds before next profile
        console.log('Waiting 30 seconds before next profile...')
        setTimeout(() => {
          proceedToNextProfile(account, session, index, allLogs)
        }, 30000)
        
      } else {
        // Update as failed
        const errorMessage = result?.error || result?.message || 'Unknown error'
        console.error('Automation failed:', errorMessage)
        
        await supabase
          .from('automation_logs')
          .update({ 
            status: 'failed',
            error_message: errorMessage,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', log.id)

        toast.error(`❌ Failed to connect with ${log.profile_name}: ${errorMessage}`)
        proceedToNextProfile(account, session, index, allLogs)
      }

    } catch (error: any) {
      console.error('Automation error:', error)
      
      await supabase
        .from('automation_logs')
        .update({ 
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', log.id)

      toast.error(`❌ Error connecting with ${log.profile_name}: ${error.message}`)
      proceedToNextProfile(account, session, index, allLogs)
    }
  }

  // Helper: Proceed to next profile
  const proceedToNextProfile = async (
    account: LinkedInAccountNew,
    session: LinkedInSession,
    index: number,
    allLogs: AutomationLog[]
  ) => {
    console.log(`Proceeding to next profile, current index: ${index}, total: ${allLogs.length}`)
    
    if (index + 1 < allLogs.length) {
      // Show countdown
      let countdown = 30
      const countdownToast = toast.loading(`Next connection in ${countdown} seconds...`)
      
      const interval = setInterval(() => {
        countdown--
        if (countdown > 0) {
          toast.loading(`Next connection in ${countdown} seconds...`, { id: countdownToast })
        } else {
          clearInterval(interval)
          toast.dismiss(countdownToast)
          
          console.log(`Starting next profile: ${index + 2}/${allLogs.length}`)
          // Start next profile
          setTimeout(() => {
            startApiAutomation(account, session, allLogs[index + 1], index + 1, allLogs)
          }, 1000)
        }
      }, 1000)
      
    } else {
      // All done
      console.log('All profiles processed, stopping automation')
      stopAutomation()
      toast.success('🎉 All connections completed!')
      fetchAutomationLogs()
    }
  }

  // Stop automation
  const stopAutomation = () => {
    console.log('Stopping automation')
    setActiveAutomation({
      isRunning: false,
      currentProfileIndex: 0,
      totalProfiles: 0,
      currentStep: 'idle'
    })
  }

  // Helper functions with null checks
  const getSelectedAccountData = (): LinkedInAccountNew | null => {
    if (!selectedAccount) return null
    const account = accounts.find(acc => acc.id === selectedAccount)
    return account || null
  }

  const getAccountSession = (accountId: number | null): LinkedInSession | null => {
    if (!accountId) return null
    return sessions[accountId] || null
  }

  // Safe getters for UI
  const safeGetAccountData = getSelectedAccountData()
  const safeGetSession = getAccountSession(selectedAccount)

  const toggleProfileSelection = (profile: ProfileToConnect) => {
    const isSelected = selectedProfiles.some(p => p.id === profile.id)
    if (isSelected) {
      setSelectedProfiles(selectedProfiles.filter(p => p.id !== profile.id))
      toast.success(`Removed ${profile.name}`)
    } else {
      setSelectedProfiles([...selectedProfiles, profile])
      toast.success(`Added ${profile.name}`)
    }
  }

  const selectAllProfiles = () => {
    if (availableProfiles.length === 0) {
      toast.error('No profiles available to select')
      return
    }
    setSelectedProfiles([...availableProfiles])
    toast.success(`Selected ${availableProfiles.length} profiles`)
  }

  const clearSelectedProfiles = () => {
    if (selectedProfiles.length === 0) {
      toast.error('No profiles selected')
      return
    }
    setSelectedProfiles([])
    toast.success('Cleared all selected profiles')
  }

  const filteredProfiles = availableProfiles.filter(profile => 
    !searchTerm || 
    profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (profile.headline && profile.headline.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Header with Server Status */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Zap className="h-6 w-6 text-yellow-500" />
              LinkedIn Automation (Integrated API)
            </h1>
            <p className="text-gray-600">
              Uses built-in Next.js API - No separate server needed!
            </p>
          </div>
          
          {/* Server Status */}
          <div className="flex items-center gap-2">
            <button
              onClick={checkServerStatus}
              disabled={serverStatus.loading}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                serverStatus.isOnline 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {serverStatus.loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : serverStatus.isOnline ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              <span>{serverStatus.isOnline ? 'API Online' : 'API Offline'}</span>
            </button>
          </div>
        </div>
        
        {/* Active Automation Status */}
        {activeAutomation.isRunning && (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-blue-800 flex items-center gap-2">
                  <Send className="h-4 w-4 animate-pulse" />
                  Automation Running...
                </div>
                <div className="text-sm text-blue-700 mt-1">
                  {activeAutomation.currentStep}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-blue-600">
                  Profile {activeAutomation.currentProfileIndex} of {activeAutomation.totalProfiles}
                </div>
                <button
                  onClick={stopAutomation}
                  className="mt-2 px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Stop Automation
                </button>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(activeAutomation.currentProfileIndex / activeAutomation.totalProfiles) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Benefits Section */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">No Separate Server</span>
            </div>
            <p className="text-sm text-green-700 mt-1">Uses built-in Next.js API routes</p>
          </div>
          
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">Automatic Cookies</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">Fetches LinkedIn cookies from database</p>
          </div>
          
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-800">Deploy Anywhere</span>
            </div>
            <p className="text-sm text-purple-700 mt-1">Works on Vercel, Netlify, etc.</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Selected</div>
              <div className="text-2xl font-bold">{selectedProfiles.length}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Database className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Cookie Ready</div>
              <div className="text-2xl font-bold">
                {safeGetSession?.li_at_cookie ? '✅' : '❌'}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Send className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Automation Type</div>
              <div className="text-xl font-bold text-purple-600">API Based</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Delay Between</div>
              <div className="text-2xl font-bold">30s</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account Selection */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              LinkedIn Account
            </h2>
            
            {loading.accounts ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2">Loading accounts...</span>
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No LinkedIn Accounts</h3>
                <p className="text-gray-600 mb-4">Connect your LinkedIn account first</p>
                <button
                  onClick={fetchAccounts}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Refresh Accounts
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="account-dropdown relative">
                  <button
                    onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-left flex justify-between items-center hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      {selectedAccount ? (
                        <>
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {safeGetAccountData?.name?.charAt(0) || 'A'}
                          </div>
                          <div>
                            <div className="font-medium">{safeGetAccountData?.name}</div>
                            <div className="text-sm text-gray-600">
                              {safeGetSession?.li_at_cookie ? '✅ Ready for automation' : '❌ Needs cookie'}
                            </div>
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-500">Choose an account...</span>
                      )}
                    </div>
                    {isAccountDropdownOpen ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                  
                  {isAccountDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {accounts.map((account: LinkedInAccountNew) => {
                        const accountSession = sessions[account.id]
                        const StatusIcon = accountSession?.li_at_cookie ? CheckCircle : XCircle
                        
                        return (
                          <button
                            key={account.id}
                            onClick={() => {
                              setSelectedAccount(account.id)
                              setIsAccountDropdownOpen(false)
                            }}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex justify-between items-center ${
                              selectedAccount === account.id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                {account.name?.charAt(0) || 'A'}
                              </div>
                              <div>
                                <div className="font-medium">{account.name}</div>
                                <div className="text-sm text-gray-600">{account.headline}</div>
                              </div>
                            </div>
                            <span 
                              className={`px-2 py-1 rounded text-xs ${
                                accountSession?.li_at_cookie 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              <StatusIcon className="h-3 w-3 inline mr-1" />
                              {accountSession?.li_at_cookie ? 'Ready' : 'No cookie'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                
                {selectedAccount && (
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h3 className="font-medium">{safeGetAccountData?.name}</h3>
                        <p className="text-sm text-gray-600">{safeGetAccountData?.headline}</p>
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                          {safeGetSession?.li_at_cookie ? (
                            <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Cookie Ready ({safeGetSession.li_at_cookie.length} chars)
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800 flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              No LinkedIn Cookie
                            </span>
                          )}
                          
                          <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800 flex items-center gap-1">
                            <Server className="h-3 w-3" />
                            Next.js API Automation
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {!safeGetSession?.li_at_cookie && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                          This account needs LinkedIn cookie for automation
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Connection Message */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-green-600" />
              Connection Message
            </h2>
            <textarea
              value={connectionNote}
              onChange={(e) => setConnectionNote(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
              rows={3}
              placeholder="Hi, I'd like to connect with you..."
            />
            <p className="text-sm text-gray-500 mt-2">
              This message will be sent with connection requests
            </p>
          </div>

          {/* Profiles Selection */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Select Profiles
                </h2>
                <p className="text-sm text-gray-600">
                  {selectedProfiles.length} selected • {availableProfiles.length} available
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllProfiles}
                  disabled={selectedProfiles.length === availableProfiles.length || availableProfiles.length === 0}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Select All
                </button>
                {selectedProfiles.length > 0 && (
                  <button
                    onClick={clearSelectedProfiles}
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search profiles..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Profiles List */}
            <div className="border rounded-lg max-h-96 overflow-y-auto">
              {loading.profiles ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2">Loading profiles...</span>
                </div>
              ) : filteredProfiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'No profiles match your search' : 'No profiles available'}
                </div>
              ) : (
                filteredProfiles.slice(0, 20).map((profile) => {
                  const isSelected = selectedProfiles.some(p => p.id === profile.id)
                  return (
                    <div 
                      key={profile.id} 
                      className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${
                        isSelected ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => toggleProfileSelection(profile)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="h-4 w-4 text-blue-600 rounded mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div>
                              <p className="font-medium">{profile.name}</p>
                              <p className="text-sm text-gray-600">{profile.headline}</p>
                            </div>
                            <a 
                              href={profile.linkedin_profile_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 ml-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          {/* Start Automation */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">Start Automation</h2>
            
            <button
              onClick={startBrowserAutomation}
              disabled={
                loading.automation || 
                !selectedAccount || 
                selectedProfiles.length === 0 ||
                !safeGetSession?.li_at_cookie ||
                activeAutomation.isRunning ||
                !serverStatus.isOnline
              }
              className={`w-full py-4 px-4 rounded-lg font-medium flex items-center justify-center gap-3 ${
                loading.automation || !selectedAccount || selectedProfiles.length === 0
                  ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                  : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {loading.automation ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  <div className="text-left">
                    <div>Start Automation</div>
                    <div className="text-sm font-normal opacity-90">
                      Send {selectedProfiles.length} connection{selectedProfiles.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </>
              )}
            </button>
            
            <div className="mt-4 space-y-3">
              {!serverStatus.isOnline && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 flex items-center gap-2">
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Automation API is offline. Refresh page.</span>
                  </p>
                </div>
              )}
              
              {selectedAccount && !safeGetSession?.li_at_cookie && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>Account needs LinkedIn cookie</span>
                  </p>
                </div>
              )}
              
              {selectedProfiles.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <span className="font-semibold">{selectedProfiles.length} profile{selectedProfiles.length !== 1 ? 's' : ''}</span> selected.
                    Will send connections via Next.js API.
                  </p>
                </div>
              )}
            </div>
            
            {/* How It Works */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Server className="h-4 w-4 text-purple-600" />
                Next.js API Automation Flow:
              </h4>
              <ol className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-purple-600">1.</span>
                  <span>Calls <code>/api/automation</code> endpoint</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-purple-600">2.</span>
                  <span>Fetches LinkedIn cookie from database</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-purple-600">3.</span>
                  <span>Opens browser and logs into LinkedIn</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-purple-600">4.</span>
                  <span>Sends connection request</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-purple-600">5.</span>
                  <span>Updates logs in database</span>
                </li>
              </ol>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Recent Activity</h2>
              <button
                onClick={fetchAutomationLogs}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                <RefreshCw className="h-4 w-4 inline mr-1" />
                Refresh
              </button>
            </div>
            
            <div className="space-y-3">
              {automationLogs.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No automation activity yet
                </div>
              ) : (
                automationLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{log.profile_name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        log.status === 'sent' ? 'bg-green-100 text-green-800' :
                        log.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-bold text-lg mb-4">Integrated Next.js API Automation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Server className="w-8 h-8 text-blue-600" />
            </div>
            <h4 className="font-semibold mb-2">1. Next.js API Route</h4>
            <p className="text-sm text-gray-600">Uses built-in <code>/api/automation</code> endpoint</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="font-semibold mb-2">2. Database Integration</h4>
            <p className="text-sm text-gray-600">Fetches cookies and stores logs in Supabase</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-purple-600" />
            </div>
            <h4 className="font-semibold mb-2">3. Auto Connection</h4>
            <p className="text-sm text-gray-600">Sends LinkedIn connection requests automatically</p>
          </div>
        </div>
        
        {/* Deployment Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">🚀 Deployment Ready:</h4>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span><strong>No separate server</strong> - Everything runs in Next.js</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span><strong>Works on Vercel</strong> - Deploy with <code>vercel deploy</code></span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span><strong>Serverless functions</strong> - Scales automatically</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span><strong>Built-in authentication</strong> - Uses Next.js middleware</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}