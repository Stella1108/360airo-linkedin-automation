"use client"

import { LinkedInAccount } from '@/types/linkedin'
import { Zap, User, Trash2, Calendar, Shield, Clock, AlertCircle, ExternalLink, Building, MapPin, RefreshCw, Play } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { useState } from 'react'

interface AccountTableProps {
  accounts: LinkedInAccount[]
  onDelete: (account: LinkedInAccount) => Promise<void>
  onStartAutomation: (account: LinkedInAccount) => Promise<void>
  onRefreshAccount?: (account: LinkedInAccount) => Promise<void>
  isLoading?: boolean
}

export default function AccountTable({ 
  accounts, 
  onDelete, 
  onStartAutomation,
  onRefreshAccount,
  isLoading = false 
}: AccountTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [automatingId, setAutomatingId] = useState<string | null>(null)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)

  const handleDelete = async (account: LinkedInAccount) => {
    setDeletingId(account.id)
    try {
      await onDelete(account)
    } finally {
      setDeletingId(null)
    }
  }

  const handleStartAutomation = async (account: LinkedInAccount) => {
    setAutomatingId(account.id)
    try {
      await onStartAutomation(account)
    } finally {
      setAutomatingId(null)
    }
  }

  const handleRefresh = async (account: LinkedInAccount) => {
    if (!onRefreshAccount) return
    setRefreshingId(account.id)
    try {
      await onRefreshAccount(account)
    } finally {
      setRefreshingId(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800 border border-green-200'
      case 'disconnected': return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
      case 'error': return 'bg-red-100 text-red-800 border border-red-200'
      case 'syncing': return 'bg-blue-100 text-blue-800 border border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border border-gray-200'
    }
  }

  const getExpiryInfo = (account: LinkedInAccount) => {
    if (!account.last_synced) return { 
      expiresIn: null, 
      isExpired: true, 
      expiryDate: null,
      expiryText: 'Never synced',
      status: 'expired'
    }
    
    const lastSynced = new Date(account.last_synced)
    const expiryDate = new Date(lastSynced)
    expiryDate.setDate(expiryDate.getDate() + 30)
    
    const now = new Date()
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    let status = 'good'
    if (daysUntilExpiry <= 0) status = 'expired'
    else if (daysUntilExpiry <= 3) status = 'critical'
    else if (daysUntilExpiry <= 7) status = 'warning'
    else if (daysUntilExpiry <= 14) status = 'notice'
    
    return {
      expiresIn: daysUntilExpiry,
      isExpired: daysUntilExpiry <= 0,
      expiryDate: expiryDate.toISOString(),
      expiryText: daysUntilExpiry > 0 ? 
        `${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}` : 
        'Expired',
      status
    }
  }

  const getExpiryColor = (days: number | null, status?: string) => {
    if (days === null) return 'text-gray-500'
    if (status === 'expired') return 'text-red-600'
    if (status === 'critical') return 'text-red-500'
    if (status === 'warning') return 'text-yellow-600'
    if (status === 'notice') return 'text-orange-600'
    return 'text-green-600'
  }

  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                LinkedIn Account
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Details
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Cookies & Sync
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Expiry
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                  <p className="mt-2 text-gray-500">Loading accounts...</p>
                </td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <User className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No LinkedIn accounts connected</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Connect your LinkedIn account to start automation.
                  </p>
                </td>
              </tr>
            ) : (
              accounts.map((account) => {
                const expiryInfo = getExpiryInfo(account)
                const expiryColor = getExpiryColor(expiryInfo.expiresIn, expiryInfo.status)
                const isDeleting = deletingId === account.id
                const isAutomating = automatingId === account.id
                const isRefreshing = refreshingId === account.id

                return (
                  <tr 
                    key={account.id} 
                    className="hover:bg-gray-50/50 transition-colors duration-150"
                  >
                    {/* Profile Column */}
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="relative h-12 w-12 flex-shrink-0">
                          {account.profile_image_url ? (
                            <img
                              src={account.profile_image_url}
                              alt={account.name}
                              className="h-12 w-12 rounded-full border-2 border-white shadow-sm object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-sm">
                              {account.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="ml-4 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {account.name}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-[200px]">
                            {account.headline || 'No headline'}
                          </div>
                          {account.email && (
                            <div className="text-xs text-gray-400 truncate max-w-[200px]">
                              {account.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Details Column */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <Building className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[150px]">
                            {account.company || 'No company'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[150px]">
                            {account.location || 'No location'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Status Column */}
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${getStatusColor(account.status)}`}>
                          {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
                        </span>
                        <div className={`text-xs ${account.is_active ? 'text-green-600' : 'text-red-600'}`}>
                          {account.is_active ? '● Active' : '● Inactive'}
                        </div>
                      </div>
                    </td>

                    {/* Cookies & Sync Column */}
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-900">
                          <Shield className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                          <span className="font-medium">{account.cookie_count || 0}</span>
                          <span className="text-gray-500 ml-1">cookies</span>
                          {account.has_li_at && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs bg-green-50 text-green-700 rounded border border-green-200">
                              LI_AT
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                          {account.last_synced ? (
                            <span className="truncate">
                              {formatDistanceToNow(new Date(account.last_synced), { addSuffix: true })}
                            </span>
                          ) : (
                            'Never synced'
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Expiry Column */}
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Clock className={`h-4 w-4 mr-2 ${expiryColor} flex-shrink-0`} />
                        <div>
                          <span className={`text-sm font-medium ${expiryColor}`}>
                            {expiryInfo.expiryText}
                          </span>
                          {expiryInfo.expiryDate && (
                            <div className="text-xs text-gray-500">
                              {format(new Date(expiryInfo.expiryDate), 'MMM d')}
                            </div>
                          )}
                        </div>
                        {expiryInfo.expiresIn !== null && expiryInfo.expiresIn <= 3 && (
                          <AlertCircle className="h-4 w-4 ml-2 text-red-500" />
                        )}
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {/* Start Automation Button */}
                        <button
                          onClick={() => handleStartAutomation(account)}
                          disabled={isAutomating || !account.is_active}
                          className={`flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow ${
                            isAutomating ? 'opacity-50 cursor-not-allowed' : 'hover:from-purple-700 hover:to-blue-700'
                          } ${!account.is_active ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={!account.is_active ? "Account is inactive" : "Start Automation"}
                        >
                          {isAutomating ? (
                            <>
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                              <span className="hidden sm:inline">Starting...</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Automate</span>
                            </>
                          )}
                        </button>

                        {/* Refresh Button */}
                        {onRefreshAccount && (
                          <button
                            onClick={() => handleRefresh(account)}
                            disabled={isRefreshing}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isRefreshing 
                                ? 'text-blue-600 bg-blue-50 cursor-not-allowed' 
                                : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            title="Refresh Account"
                          >
                            {isRefreshing ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </button>
                        )}

                        {/* View Profile Button */}
                        {account.profile_url && (
                          <button
                            onClick={() => window.open(account.profile_url!, '_blank', 'noopener,noreferrer')}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Profile"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(account)}
                          disabled={isDeleting}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDeleting 
                              ? 'text-red-400 bg-red-50 cursor-not-allowed' 
                              : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                          }`}
                          title="Delete Account"
                        >
                          {isDeleting ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}