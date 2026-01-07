import { LinkedInAccount } from '@/types/linkedin'
import { User, Link, Trash2, Calendar, Shield, Clock, AlertCircle } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

interface AccountCardProps {
  account: LinkedInAccount
  onDelete: () => void
}

export default function AccountCard({ account, onDelete }: AccountCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800'
      case 'disconnected': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getExpiryInfo = (account: LinkedInAccount) => {
    if (!account.last_synced) return { expiresIn: null, isExpired: true, expiryDate: null }
    
    const lastSynced = new Date(account.last_synced)
    const expiryDate = new Date(lastSynced)
    expiryDate.setDate(expiryDate.getDate() + 30) // LinkedIn cookies typically last 30 days
    
    const now = new Date()
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    return {
      expiresIn: daysUntilExpiry,
      isExpired: daysUntilExpiry <= 0,
      expiryDate: expiryDate.toISOString(),
      expiryText: daysUntilExpiry > 0 ? 
        `${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}` : 
        'Expired'
    }
  }

  const getExpiryColor = (days: number | null) => {
    if (days === null) return 'text-gray-500'
    if (days <= 0) return 'text-red-600'
    if (days <= 7) return 'text-yellow-600'
    if (days <= 14) return 'text-orange-600'
    return 'text-green-600'
  }

  const expiryInfo = getExpiryInfo(account)
  const expiryColor = getExpiryColor(expiryInfo.expiresIn)

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            {account.profile_image_url ? (
              <img
                src={account.profile_image_url}
                alt={account.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-lg">{account.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(account.status)}`}>
                {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
              </span>
            </div>
          </div>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {account.headline && (
            <p className="text-gray-700">{account.headline}</p>
          )}

          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <Shield className="h-4 w-4 mr-2" />
              <span>{account.cookie_count} cookies</span>
              {account.has_li_at && (
                <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                  LI_AT ✓
                </span>
              )}
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              {account.last_synced ? (
                <span>Synced {formatDistanceToNow(new Date(account.last_synced), { addSuffix: true })}</span>
              ) : (
                <span>Never synced</span>
              )}
            </div>

            <div className="flex items-center text-sm">
              <Clock className={`h-4 w-4 mr-2 ${expiryColor}`} />
              <span className={expiryColor}>
                Expires in: <strong>{expiryInfo.expiryText}</strong>
              </span>
              {expiryInfo.expiresIn !== null && expiryInfo.expiresIn <= 3 && (
                <AlertCircle className="h-4 w-4 ml-2 text-red-500" />
              )}
            </div>

            {expiryInfo.expiryDate && (
              <div className="text-xs text-gray-500 pl-6">
                Expiry date: {format(new Date(expiryInfo.expiryDate), 'MMM d, yyyy')}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Connected {formatDistanceToNow(new Date(account.created_at), { addSuffix: true })}
          </div>
          {account.profile_url && (
            <button
              onClick={() => window.open(account.profile_url!, '_blank')}
              className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
            >
              <Link className="h-3 w-3" />
              Profile
            </button>
          )}
        </div>
      </div>
    </div>
  )
}