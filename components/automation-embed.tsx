'use client'

import { useState } from 'react'

export default function AutomationEmbed() {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [profileUrl, setProfileUrl] = useState('')
  const [accountId, setAccountId] = useState('')
  const [connectionNote, setConnectionNote] = useState('')

  const startAutomation = async () => {
    if (!profileUrl || !accountId) {
      alert('Please enter profile URL and account ID')
      return
    }

    setIsRunning(true)
    setResult(null)

    try {
      const response = await fetch('/api/automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: parseInt(accountId),
          profile_url: profileUrl,
          connection_note: connectionNote,
          embedded: true
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setResult({
          success: true,
          message: 'Automation started! Check the browser window that just opened.',
          automationId: data.automationId
        })
        
        // You could open the embedded URL in an iframe
        if (data.embeddedUrl) {
          window.open(data.embeddedUrl, '_blank')
        }
      } else {
        setResult({
          success: false,
          error: data.error || 'Failed to start automation'
        })
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="p-6 border rounded-lg">
      <h2 className="text-xl font-bold mb-4">LinkedIn Automation</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Account ID</label>
          <input
            type="number"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter account ID"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Profile URL</label>
          <input
            type="text"
            value={profileUrl}
            onChange={(e) => setProfileUrl(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="https://linkedin.com/in/username"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Connection Note (Optional)</label>
          <textarea
            value={connectionNote}
            onChange={(e) => setConnectionNote(e.target.value)}
            className="w-full p-2 border rounded"
            rows={3}
            placeholder="Hi, I'd like to connect..."
          />
        </div>
        
        <button
          onClick={startAutomation}
          disabled={isRunning}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isRunning ? 'Starting...' : 'Start Automation'}
        </button>
        
        {result && (
          <div className={`p-4 rounded ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {result.success ? '✅ ' : '❌ '}
            {result.message || result.error}
          </div>
        )}
      </div>
    </div>
  )
}