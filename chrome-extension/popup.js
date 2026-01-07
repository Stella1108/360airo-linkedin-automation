// popup.js - FIXED VERSION
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup starting...');
  
  // Get all elements - FIXED: Removed invalid ID references
  const elements = {
    accountsContainer: document.getElementById('accountsContainer'),
    noAccounts: document.getElementById('noAccounts'),
    connectNewBtn: document.getElementById('connectNewBtn'),
    syncAllBtn: document.getElementById('syncAllBtn'),
    accountStats: document.getElementById('accountStats'),
    accountCount: document.getElementById('accountCount'),
    testBtn: document.getElementById('testBtn'),
    debugCookiesBtn: document.getElementById('debugCookiesBtn'),
    forceConnectBtn: document.getElementById('forceConnectBtn'),
    dashboardBtn: document.getElementById('dashboardBtn'),
    refreshAllBtn: document.getElementById('refreshAllBtn'),
    autoDetectBtn: document.getElementById('autoDetectBtn'),
    totalAccounts: document.getElementById('totalAccounts'),
    authenticatedAccounts: document.getElementById('authenticatedAccounts'),
    syncedAccounts: document.getElementById('syncedAccounts'),
    activeAccounts: document.getElementById('activeAccounts'),
    autoDetectionStatus: document.getElementById('autoDetectionStatus'),
    lastSyncTime: document.getElementById('lastSyncTime')
  };
  
  // Check if all required elements exist
  if (!elements.connectNewBtn) {
    console.error('❌ Connect button not found! Check your HTML IDs');
  }
  
  let accounts = [];
  let currentSession = null;
  
  // Initialize
  await init();
  setupEventListeners();
  setupMessageListener();
  
  // ========== MAIN FUNCTIONS ==========
  
  async function init() {
    try {
      console.log('Loading accounts...');
      
      // Load accounts from background
      const response = await chrome.runtime.sendMessage({ 
        action: 'GET_ACCOUNTS' 
      });
      
      if (response.success) {
        accounts = response.accounts || [];
        console.log(`✅ Found ${accounts.length} accounts`);
        updateStats();
        
        // Update last sync time
        if (elements.lastSyncTime) {
          elements.lastSyncTime.textContent = new Date().toLocaleTimeString();
        }
      } else {
        console.error('Failed to get accounts:', response.error);
        accounts = [];
      }
      
      // Check current session
      await checkCurrentSession();
      
      // Update UI
      updateUI();
      
    } catch (error) {
      console.error('Init error:', error);
      showMessage('Error loading accounts', 'error');
    }
  }
  
  async function checkCurrentSession() {
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'GET_CURRENT_SESSION' 
      });
      
      if (response.success) {
        currentSession = response;
        console.log('Current session:', {
          connected: response.connected,
          profile: response.profile?.name,
          hasLiAt: response.hasLiAt
        });
      } else {
        currentSession = null;
        console.log('No current session or error:', response.error);
      }
    } catch (error) {
      console.error('Session check error:', error);
      currentSession = null;
    }
  }
  
  function updateStats() {
    if (!elements.totalAccounts) return;
    
    const total = accounts.length;
    const authenticated = accounts.filter(a => a.hasLiAt).length;
    const synced = accounts.filter(a => a.supabaseSynced).length;
    const active = accounts.filter(a => a.isActive).length;
    
    elements.totalAccounts.textContent = total;
    elements.authenticatedAccounts.textContent = authenticated;
    elements.syncedAccounts.textContent = synced;
    elements.activeAccounts.textContent = active;
    
    if (elements.accountStats) {
      elements.accountStats.textContent = 
        `${total} accounts • ${authenticated} authenticated • ${synced} synced • ${active} active`;
    }
    
    if (elements.accountCount) {
      elements.accountCount.textContent = total;
    }
  }
  
  function updateUI() {
    console.log('Updating UI...');
    
    // Update counts
    updateStats();
    
    // Show/hide no accounts
    if (accounts.length === 0) {
      showNoAccounts();
    } else {
      hideNoAccounts();
      renderAccounts();
    }
    
    // Update connect button based on current session
    updateConnectButton();
  }
  
  function showNoAccounts() {
    if (elements.noAccounts) {
      elements.noAccounts.style.display = 'block';
    }
    
    if (elements.accountsContainer) {
      elements.accountsContainer.innerHTML = '';
    }
    
    if (elements.syncAllBtn) {
      elements.syncAllBtn.disabled = true;
    }
  }
  
  function hideNoAccounts() {
    if (elements.noAccounts) {
      elements.noAccounts.style.display = 'none';
    }
    
    if (elements.syncAllBtn) {
      elements.syncAllBtn.disabled = false;
    }
  }
  
  function updateConnectButton() {
    if (!elements.connectNewBtn) return;
    
    // Always show connect button
    elements.connectNewBtn.innerHTML = '<span>🔗</span><span>Connect LinkedIn Account</span>';
    elements.connectNewBtn.disabled = false;
    
    // Set click handler
    elements.connectNewBtn.onclick = connectAccount;
  }
  
  // ========== CONNECT ACCOUNT FUNCTION - SIMPLIFIED ==========
  async function connectAccount() {
    console.log('Connect button clicked');
    
    if (!elements.connectNewBtn) return;
    
    // Show loading state
    const originalHTML = elements.connectNewBtn.innerHTML;
    elements.connectNewBtn.disabled = true;
    elements.connectNewBtn.innerHTML = '<span>⏳</span><span>Checking...</span>';
    
    try {
      // Check current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (!currentTab?.url?.includes('linkedin.com')) {
        // Not on LinkedIn, open it
        await chrome.tabs.create({
          url: 'https://www.linkedin.com',
          active: true
        });
        showMessage('Opening LinkedIn...', 'info');
        setTimeout(() => window.close(), 1000);
        return;
      }
      
      // On LinkedIn, check login status
      showMessage('Checking LinkedIn session...', 'info');
      
      const sessionResponse = await chrome.runtime.sendMessage({ 
        action: 'GET_CURRENT_SESSION' 
      });
      
      if (!sessionResponse.success || !sessionResponse.connected) {
        showMessage('Please log into LinkedIn first', 'warning');
        elements.connectNewBtn.innerHTML = '<span>🔐</span><span>Login Required</span>';
        
        setTimeout(() => {
          elements.connectNewBtn.innerHTML = originalHTML;
          elements.connectNewBtn.disabled = false;
        }, 2000);
        return;
      }
      
      // Already connected?
      if (sessionResponse.alreadyConnected) {
        showMessage('Account already connected!', 'info');
        elements.connectNewBtn.innerHTML = '<span>✅</span><span>Already Connected</span>';
        setTimeout(() => {
          elements.connectNewBtn.innerHTML = originalHTML;
          elements.connectNewBtn.disabled = false;
        }, 2000);
        return;
      }
      
      // Connect the account
      showMessage('Connecting account...', 'info');
      elements.connectNewBtn.innerHTML = '<span>🔗</span><span>Connecting...</span>';
      
      const connectResponse = await chrome.runtime.sendMessage({
        action: 'CONNECT_CURRENT_ACCOUNT'
      });
      
      if (connectResponse.success) {
        showMessage(`✅ ${connectResponse.message}`, 'success');
        elements.connectNewBtn.innerHTML = '<span>✅</span><span>Connected!</span>';
        
        // Reload accounts
        await init();
        
        // Reset button
        setTimeout(() => {
          elements.connectNewBtn.innerHTML = originalHTML;
          elements.connectNewBtn.disabled = false;
        }, 2000);
      } else {
        showMessage(`❌ ${connectResponse.error}`, 'error');
        elements.connectNewBtn.innerHTML = originalHTML;
        elements.connectNewBtn.disabled = false;
      }
      
    } catch (error) {
      console.error('Connect error:', error);
      showMessage('❌ Connection error', 'error');
      elements.connectNewBtn.innerHTML = originalHTML;
      elements.connectNewBtn.disabled = false;
    }
  }
  
  // ========== RENDER ACCOUNTS ==========
  function renderAccounts() {
    if (!elements.accountsContainer) return;
    
    elements.accountsContainer.innerHTML = '';
    
    accounts.forEach(account => {
      const card = createAccountCard(account);
      elements.accountsContainer.appendChild(card);
    });
  }
  
  function createAccountCard(account) {
    const card = document.createElement('div');
    card.className = 'account-card';
    if (account.isActive) card.classList.add('active');
    if (account.autoDetected) card.classList.add('auto-detected');
    
    // Get initials
    const initials = getInitials(account.name);
    
    // Format last synced time
    const lastSynced = account.lastSynced 
      ? formatTimeAgo(new Date(account.lastSynced))
      : 'Never synced';
    
    // Create badges
    const badges = [];
    if (account.hasLiAt) {
      badges.push('<span class="badge auth">🔐 li_at</span>');
    }
    if (account.autoDetected) {
      badges.push('<span class="badge auto">🤖 Auto</span>');
    }
    if (account.supabaseSynced) {
      badges.push('<span class="badge synced">☁️ Synced</span>');
    }
    
    // Create details
    const details = [];
    if (account.company) {
      details.push(`<span class="detail">💼 ${account.company}</span>`);
    }
    if (account.location) {
      details.push(`<span class="detail">📍 ${account.location}</span>`);
    }
    if (account.lastSynced) {
      details.push(`<span class="detail">🕒 ${lastSynced}</span>`);
    }
    
    card.innerHTML = `
      <div class="account-avatar">
        <div class="avatar-initials">${initials}</div>
        ${account.profileImage ? `<img src="${account.profileImage}" alt="${account.name}" onerror="this.style.display='none'">` : ''}
      </div>
      <div class="account-details">
        <div class="account-header">
          <div class="account-name">
            <span>${account.name}</span>
            <div class="account-badges">
              ${badges.join('')}
            </div>
          </div>
        </div>
        ${account.headline ? `<div class="account-headline">${account.headline}</div>` : ''}
        <div class="account-details-row">
          ${details.join('')}
        </div>
        <div class="account-quick-stats">
          ${account.connections ? `<span class="quick-stat">👥 ${account.connections}</span>` : ''}
          ${account.liAtLength ? `<span class="quick-stat">🔑 ${account.liAtLength} chars</span>` : ''}
        </div>
      </div>
      <div class="account-actions">
        <button class="btn-action test-auth" title="Test authentication">
          🔍 Test
        </button>
        <button class="btn-action refresh" title="Refresh cookies">
          🔄 Refresh
        </button>
        <button class="btn-switch ${account.isActive ? 'active' : ''}" title="${account.isActive ? 'Active' : 'Set as active'}">
          ${account.isActive ? '⭐' : '⚪'}
        </button>
        <button class="btn-remove" title="Remove account">
          ✕
        </button>
      </div>
    `;
    
    // Add event listeners
    const testBtn = card.querySelector('.btn-action.test-auth');
    const refreshBtn = card.querySelector('.btn-action.refresh');
    const switchBtn = card.querySelector('.btn-switch');
    const removeBtn = card.querySelector('.btn-remove');
    
    if (testBtn) {
      testBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        testAccountAuth(account.id);
      });
    }
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        refreshAccountCookies(account.id);
      });
    }
    
    if (switchBtn) {
      switchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleAccountActive(account.id);
      });
    }
    
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeAccount(account.id);
      });
    }
    
    card.addEventListener('click', () => {
      showAccountDetails(account);
    });
    
    return card;
  }
  
  // ========== ACCOUNT ACTIONS ==========
  async function testAccountAuth(accountId) {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;
    
    showMessage(`Testing "${account.name}"...`, 'info');
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'VALIDATE_COOKIES',
        accountId: accountId
      });
      
      if (response?.success) {
        if (response.isValid) {
          showMessage(`✅ "${account.name}" authentication successful!`, 'success');
        } else {
          showMessage(`❌ "${account.name}" authentication failed`, 'error');
        }
      } else {
        showMessage(`❌ Test failed: ${response?.error}`, 'error');
      }
    } catch (error) {
      showMessage(`❌ Test error`, 'error');
    }
  }
  
  async function refreshAccountCookies(accountId) {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;
    
    showMessage(`Refreshing "${account.name}"...`, 'info');
    
    try {
      // Open LinkedIn in new tab
      const tab = await chrome.tabs.create({
        url: account.profileUrl || 'https://www.linkedin.com',
        active: false
      });
      
      // Wait and check for cookies
      setTimeout(async () => {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'GET_CURRENT_PROFILE'
          }).catch(() => null);
          
          if (response?.hasLiAt && response.cookies) {
            // Update cookies
            await chrome.runtime.sendMessage({
              action: 'UPDATE_ACCOUNT_COOKIES',
              accountId: accountId,
              cookies: response.cookies
            });
            
            showMessage(`✅ "${account.name}" refreshed!`, 'success');
            await init();
          } else {
            showMessage(`❌ No cookies found`, 'error');
          }
          
          chrome.tabs.remove(tab.id);
        } catch (error) {
          chrome.tabs.remove(tab.id);
        }
      }, 3000);
      
    } catch (error) {
      showMessage(`❌ Refresh error`, 'error');
    }
  }
  
  async function toggleAccountActive(accountId) {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;
    
    account.isActive = !account.isActive;
    updateUI();
    
    showMessage(`${account.isActive ? 'Activated' : 'Deactivated'} "${account.name}"`, 'info');
    
    try {
      await chrome.runtime.sendMessage({
        action: 'UPDATE_ACCOUNT',
        accountId: accountId,
        updates: { isActive: account.isActive }
      });
    } catch (error) {
      console.error('Toggle error:', error);
    }
  }
  
  async function removeAccount(accountId) {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;
    
    if (!confirm(`Remove "${account.name}"?`)) return;
    
    showMessage(`Removing "${account.name}"...`, 'info');
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'REMOVE_ACCOUNT',
        accountId: accountId
      });
      
      if (response.success) {
        showMessage(`✅ Removed "${account.name}"`, 'success');
        await init();
      } else {
        showMessage(`❌ Remove failed`, 'error');
      }
    } catch (error) {
      showMessage('❌ Remove error', 'error');
    }
  }
  
  async function syncAccount(accountId) {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;
    
    showMessage(`Syncing "${account.name}"...`, 'info');
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'SYNC_ACCOUNT_TO_SUPABASE',
        accountId: accountId
      });
      
      if (response.success) {
        showMessage(`✅ "${account.name}" synced!`, 'success');
        await init();
      } else {
        showMessage(`❌ Sync failed`, 'error');
      }
    } catch (error) {
      showMessage(`❌ Sync error`, 'error');
    }
  }
  
  async function syncAllAccounts() {
    if (accounts.length === 0) {
      showMessage('No accounts to sync', 'info');
      return;
    }
    
    const accountsToSync = accounts.filter(a => !a.supabaseSynced);
    if (accountsToSync.length === 0) {
      showMessage('All accounts synced', 'info');
      return;
    }
    
    showMessage(`Syncing ${accountsToSync.length} accounts...`, 'info');
    
    if (elements.syncAllBtn) {
      elements.syncAllBtn.disabled = true;
      elements.syncAllBtn.innerHTML = '<span>⏳</span><span>Syncing...</span>';
    }
    
    let successCount = 0;
    
    for (const account of accountsToSync) {
      try {
        await chrome.runtime.sendMessage({
          action: 'SYNC_ACCOUNT_TO_SUPABASE',
          accountId: account.id
        });
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Sync error for ${account.name}:`, error);
      }
    }
    
    if (elements.syncAllBtn) {
      elements.syncAllBtn.disabled = false;
      elements.syncAllBtn.innerHTML = '<span>🔄</span><span>Sync All</span>';
    }
    
    showMessage(`✅ ${successCount} synced`, successCount === accountsToSync.length ? 'success' : 'warning');
    await init();
  }
  
  // ========== EVENT LISTENERS ==========
  function setupEventListeners() {
    // Connect button
    if (elements.connectNewBtn) {
      elements.connectNewBtn.addEventListener('click', connectAccount);
    }
    
    // Sync All button
    if (elements.syncAllBtn) {
      elements.syncAllBtn.addEventListener('click', syncAllAccounts);
    }
    
    // Test button
    if (elements.testBtn) {
      elements.testBtn.addEventListener('click', async () => {
        showMessage('Testing...', 'info');
        try {
          const response = await chrome.runtime.sendMessage({
            action: 'TEST_CONNECTION'
          });
          
          if (response.success) {
            showMessage(`✅ ${response.message} (${response.accountsCount} accounts)`, 'success');
          } else {
            showMessage('❌ Test failed', 'error');
          }
        } catch (error) {
          showMessage('❌ Test error', 'error');
        }
      });
    }
    
    // Debug cookies button
    if (elements.debugCookiesBtn) {
      elements.debugCookiesBtn.addEventListener('click', async () => {
        if (accounts.length === 0) {
          showMessage('No accounts', 'info');
          return;
        }
        
        showMessage('Debugging...', 'info');
        
        const debugInfo = [];
        for (const account of accounts) {
          try {
            const response = await chrome.runtime.sendMessage({
              action: 'DEBUG_COOKIE_STORAGE',
              accountId: account.id
            });
            
            if (response.success) {
              debugInfo.push(`${account.name}: li_at=${response.hasLiAt ? '✅' : '❌'} (${response.liAtLength} chars)`);
            }
          } catch (error) {
            debugInfo.push(`${account.name}: ❌ Error`);
          }
        }
        
        alert('Cookie Debug:\n\n' + debugInfo.join('\n'));
      });
    }
    
    // Force connect button
    if (elements.forceConnectBtn) {
      elements.forceConnectBtn.addEventListener('click', async () => {
        showMessage('Force connecting...', 'info');
        
        try {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs[0]?.url?.includes('linkedin.com')) {
            const response = await chrome.runtime.sendMessage({
              action: 'CONNECT_CURRENT_ACCOUNT'
            });
            
            if (response.success) {
              showMessage(`✅ ${response.message}`, 'success');
              await init();
            } else {
              showMessage(`❌ ${response.error}`, 'error');
            }
          } else {
            showMessage('❌ Not on LinkedIn', 'error');
          }
        } catch (error) {
          showMessage('❌ Error', 'error');
        }
      });
    }
    
    // Dashboard button
    if (elements.dashboardBtn) {
      elements.dashboardBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'http://localhost:3000' });
      });
    }
    
    // Refresh All button
    if (elements.refreshAllBtn) {
      elements.refreshAllBtn.addEventListener('click', async () => {
        showMessage('Refreshing...', 'info');
        await init();
        showMessage('✅ Refreshed', 'success');
      });
    }
    
    // Auto Detect button
    if (elements.autoDetectBtn) {
      elements.autoDetectBtn.addEventListener('click', async () => {
        showMessage('Auto detecting...', 'info');
        
        try {
          const tabs = await chrome.tabs.query({ url: '*://*.linkedin.com/*' });
          
          if (tabs.length === 0) {
            await chrome.tabs.create({
              url: 'https://www.linkedin.com',
              active: true
            });
            showMessage('✅ LinkedIn opened', 'info');
            setTimeout(() => window.close(), 1000);
          } else {
            let found = false;
            for (const tab of tabs) {
              try {
                const response = await chrome.tabs.sendMessage(tab.id, {
                  action: 'GET_CURRENT_PROFILE'
                }).catch(() => null);
                
                if (response?.isLoggedIn && response.profile) {
                  found = true;
                  const connectResponse = await chrome.runtime.sendMessage({
                    action: 'CONNECT_CURRENT_ACCOUNT'
                  }).catch(() => null);
                  
                  if (connectResponse?.success) {
                    showMessage(`✅ Connected ${response.profile.name}`, 'success');
                    await init();
                    break;
                  }
                }
              } catch (error) {}
            }
            
            if (!found) {
              showMessage('❌ No logged-in accounts found', 'error');
            }
          }
        } catch (error) {
          showMessage('❌ Error', 'error');
        }
      });
    }
  }
  
  // ========== MESSAGE LISTENER ==========
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message) => {
      switch (message.action) {
        case 'ACCOUNT_ADDED':
          showMessage(`✅ ${message.account?.name || 'Account'} connected!`, 'success');
          init();
          break;
      }
    });
  }
  
  // ========== HELPER FUNCTIONS ==========
  function showAccountDetails(account) {
    const details = `
Name: ${account.name}
Headline: ${account.headline || 'N/A'}
Company: ${account.company || 'N/A'}
Location: ${account.location || 'N/A'}
Connections: ${account.connections || 0}
Profile URL: ${account.profileUrl}
Status: ${account.isActive ? '✅ Active' : '❌ Inactive'}
li_at Cookie: ${account.hasLiAt ? '✅ Present' : '❌ Missing'}
li_at Length: ${account.liAtLength || 0} chars
Supabase Sync: ${account.supabaseSynced ? '✅ Synced' : '❌ Not synced'}
Last Synced: ${account.lastSynced ? new Date(account.lastSynced).toLocaleString() : 'Never'}
Connected: ${account.connectedAt ? new Date(account.connectedAt).toLocaleString() : 'Unknown'}
    `.trim();
    
    alert(`Account Details:\n\n${details}`);
  }
  
  function getInitials(name) {
    if (!name) return '??';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
  }
  
  function formatTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }
  
  function showMessage(text, type = 'info') {
    console.log(`${type}:`, text);
    
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = text;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }
  
  // Initial UI update
  updateUI();
  console.log('✅ Popup ready!');
});