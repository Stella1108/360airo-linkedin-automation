"use client"

import { useEffect, useState } from 'react'
import { LinkedInAccount } from '@/types/linkedin'
import AccountCard from '@/components/accounts/AccountCard'
import AccountTable from '@/components/accounts/AccountTable'
import { RefreshCw, Plus } from 'lucide-react'

// This should be your complete accounts page, not a component
export default function DashboardPage() {
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    accountId: null as string | null,
    accountName: '',
  })

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setAccounts(data)
    } catch (error) {
      console.error('Error fetching accounts:', error)
      alert('Failed to load accounts. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchAccounts()
  }

  const handleDelete = async () => {
    if (!deleteDialog.accountId) return
    
    try {
      const response = await fetch(`/api/accounts/${deleteDialog.accountId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setAccounts(accounts.filter(account => account.id !== deleteDialog.accountId))
      setDeleteDialog({ open: false, accountId: null, accountName: '' })
      alert('Account deleted successfully!')
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Failed to delete account. Please try again.')
    }
  }

  // Async version for AccountTable if it expects Promise<void>
  const confirmDelete = async (account: LinkedInAccount) => {
    setDeleteDialog({
      open: true,
      accountId: account.id,
      accountName: account.name,
    })
  }

  // Sync version for AccountCard if it expects void
  const confirmDeleteSync = (account: LinkedInAccount) => {
    setDeleteDialog({
      open: true,
      accountId: account.id,
      accountName: account.name,
    })
  }

  // Handler for starting automation
  const handleStartAutomation = async (account: LinkedInAccount) => {
    try {
      alert(`Starting automation for ${account.name}...`)
      // Add your automation logic here
      // Example: fetch('/api/automation/start', { method: 'POST', body: JSON.stringify({ accountId: account.id }) })
    } catch (error) {
      console.error('Error starting automation:', error)
      alert('Failed to start automation')
    }
  }

  // Handler for refreshing account data
  const handleRefreshAccount = async (account: LinkedInAccount) => {
    try {
      alert(`Refreshing data for ${account.name}...`)
      // Add your refresh logic here
      // Example: fetch(`/api/accounts/${account.id}/refresh`, { method: 'POST' })
    } catch (error) {
      console.error('Error refreshing account:', error)
      alert('Failed to refresh account data')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LinkedIn Accounts</h1>
          <p className="text-gray-600 mt-2">
            Manage your connected LinkedIn accounts for automation
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => {
              window.open('https://www.linkedin.com', '_blank')
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Connect Account
          </button>

          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 ${
                viewMode === 'grid' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } transition-colors`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 ${
                viewMode === 'table' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } transition-colors`}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No LinkedIn accounts connected
          </h3>
          <p className="text-gray-500 mb-6">
            Connect your first LinkedIn account to start automation
          </p>
          <button
            onClick={() => {
              window.open('https://www.linkedin.com', '_blank')
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Connect Your First Account
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onDelete={() => confirmDeleteSync(account)}
            />
          ))}
        </div>
      ) : (
        <AccountTable
          accounts={accounts}
          onDelete={confirmDelete}
          onStartAutomation={handleStartAutomation}
          onRefreshAccount={handleRefreshAccount}
          isLoading={refreshing}
        />
      )}

      {/* Alert Dialog for Delete Confirmation */}
      {deleteDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Account
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the account for <strong>{deleteDialog.accountName}</strong>? 
              This action cannot be undone and will remove all associated data from the database.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteDialog({ open: false, accountId: null, accountName: '' })}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}