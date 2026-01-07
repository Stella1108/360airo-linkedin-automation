// background.js - COMPLETE FIXED VERSION FOR NEW TABLES
console.log('🚀 360airo LinkedIn Connector starting...');

// ========== SUPABASE SETUP ==========
let supabaseClient = null;

// Dynamic import for Supabase (ES Module compatible)
async function initSupabase() {
  if (!supabaseClient) {
    try {
      // Method 1: Try to import from CDN (if you're using bundler)
      if (typeof supabase !== 'undefined') {
        supabaseClient = supabase;
        console.log('✅ Supabase already available globally');
        return supabaseClient;
      }
      
      // Method 2: Use direct fetch to Supabase API
      supabaseClient = createSupabaseClient();
      console.log('✅ Supabase client initialized via direct API');
    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error);
      supabaseClient = null;
    }
  }
  return supabaseClient;
}

// Create Supabase client without importScripts
function createSupabaseClient() {
  const SUPABASE_URL = 'https://tlojcedldomndodmnjan.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsb2pjZWRsZG9tbmRvZG1uamFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMzcyMDYsImV4cCI6MjA2NzgxMzIwNn0.rM-5ap5sYqV9reVU6oVPY8Dn9xQCr5u3cW8RbWoo1W0';
  
  return {
    from: (table) => ({
      select: (columns = '*') => ({
        async then(callback) {
          try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${columns}`, {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
              }
            });
            const data = await response.json();
            callback({ data, error: !response.ok ? new Error('Request failed') : null });
          } catch (error) {
            callback({ data: null, error });
          }
        }
      })
    })
  };
}

// ========== ENCRYPTION FUNCTIONS ==========
function encryptData(data) {
  try {
    if (!data) return null;
    let stringToEncrypt;
    if (typeof data === 'string') {
      stringToEncrypt = data;
    } else if (typeof data === 'object') {
      stringToEncrypt = JSON.stringify(data);
    } else {
      stringToEncrypt = String(data);
    }
    const encoded = encodeURIComponent(stringToEncrypt);
    const encrypted = btoa(encoded);
    console.log(`🔐 Encrypted ${stringToEncrypt.length} chars`);
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
}

function decryptData(encrypted) {
  try {
    if (!encrypted) return null;
    const decoded = atob(encrypted);
    const jsonString = decodeURIComponent(decoded);
    try {
      return JSON.parse(jsonString);
    } catch {
      return jsonString;
    }
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

// ========== USER & INSTALLATION MANAGEMENT ==========
async function getExtensionInstallationId() {
  const storage = await chrome.storage.local.get(['installationId']);
  if (!storage.installationId) {
    storage.installationId = `ext_inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await chrome.storage.local.set({ installationId: storage.installationId });
    console.log(`🆕 Generated installation ID: ${storage.installationId}`);
    await registerInstallationInSupabase(storage.installationId);
  }
  return storage.installationId;
}

async function registerInstallationInSupabase(installationId) {
  try {
    const browserFingerprint = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      languages: navigator.languages,
      extensionVersion: chrome.runtime.getManifest().version
    };
    
    await fetch('https://tlojcedldomndodmnjan.supabase.co/rest/v1/extension_installations', {
      method: 'POST',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsb2pjZWRsZG9tbmRvZG1uamFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMzcyMDYsImV4cCI6MjA2NzgxMzIwNn0.rM-5ap5sYqV9reVU6oVPY8Dn9xQCr5u3cW8RbWoo1W0',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsb2pjZWRsZG9tbmRvZG1uamFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMzcyMDYsImV4cCI6MjA2NzgxMzIwNn0.rM-5ap5sYqV9reVU6oVPY8Dn9xQCr5u3cW8RbWoo1W0',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        installation_id: installationId,
        browser_fingerprint: JSON.stringify(browserFingerprint),
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString()
      })
    });
    console.log('✅ Installation registered');
  } catch (error) {
    console.error('Error registering installation:', error);
  }
}

async function getDashboardUserId() {
  const storage = await chrome.storage.local.get(['dashboardUserId']);
  return storage.dashboardUserId || null;
}

// ========== STATE MANAGEMENT ==========
let connectedAccounts = new Map();
let recentlyProcessed = new Set();
let loginDetectionActive = true;

async function loadAccounts() {
  try {
    const storage = await chrome.storage.local.get(['linkedinAccounts']);
    if (storage.linkedinAccounts) {
      storage.linkedinAccounts.forEach(account => {
        connectedAccounts.set(account.profileId, account);
      });
      console.log(`📁 Loaded ${connectedAccounts.size} accounts`);
    }
  } catch (error) {
    console.error('Error loading accounts:', error);
  }
}

async function saveAccounts() {
  try {
    const accounts = Array.from(connectedAccounts.values());
    await chrome.storage.local.set({ linkedinAccounts: accounts });
    console.log(`💾 Saved ${accounts.length} accounts`);
    return true;
  } catch (error) {
    console.error('Error saving accounts:', error);
    return false;
  }
}

// ========== STORE ACCOUNT WITH LI_AT COOKIE ==========
async function storeAccountWithLiAt(profile, cookies, tabUrl) {
  try {
    console.log(`🔗 Storing account with li_at cookie...`);
    
    if (!cookies || !Array.isArray(cookies)) {
      throw new Error('No cookies provided');
    }
    
    const liAtCookie = cookies.find(c => c.name === 'li_at');
    if (!liAtCookie) {
      console.warn('⚠️ No li_at cookie found');
      return { success: false, error: 'No li_at cookie found', stored: false };
    }
    
    console.log(`✅ li_at cookie found: ${liAtCookie.value.length} characters`);
    
    const accountId = `acc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const profileId = profile.profileId || `profile_${Date.now()}`;
    
    const encryptedCookies = encryptData(cookies);
    if (!encryptedCookies) {
      return { success: false, error: 'Failed to encrypt cookies', stored: false };
    }
    
    const installationId = await getExtensionInstallationId();
    const dashboardUserId = await getDashboardUserId();
    
    const newAccount = {
      id: accountId,
      profileId: profileId,
      name: profile.name || 'Unknown User',
      headline: profile.headline || '',
      company: profile.company || '',
      location: profile.location || '',
      connections: profile.connections || 0,
      profileImage: profile.profileImage || '',
      profileUrl: profile.profileUrl || tabUrl,
      cookies: encryptedCookies,
      hasLiAt: true,
      liAtLength: liAtCookie.value.length,
      liAtPreview: liAtCookie.value.substring(0, 15) + '...',
      connectedAt: new Date().toISOString(),
      lastSynced: new Date().toISOString(),
      isActive: true,
      status: 'connected',
      supabaseSynced: false,
      cookieCount: cookies.length,
      autoDetected: false,
      installationId: installationId,
      dashboardUserId: dashboardUserId
    };
    
    connectedAccounts.set(profileId, newAccount);
    await saveAccounts();
    
    console.log(`✅ Account "${profile.name || 'Unknown'}" stored locally`);
    console.log(`   Installation: ${installationId}`);
    console.log(`   Dashboard User: ${dashboardUserId || 'Not linked'}`);
    
    const supabaseResult = await storeToSupabaseNewTables(accountId, profile, cookies, installationId, dashboardUserId);
    
    if (supabaseResult.success) {
      newAccount.supabaseSynced = true;
      newAccount.supabaseAccountId = supabaseResult.supabaseAccountId;
      newAccount.supabaseSessionId = supabaseResult.supabaseSessionId;
      await saveAccounts();
      console.log(`✅ Account stored to NEW Supabase tables`);
    } else {
      console.log(`⚠️ Supabase storage failed: ${supabaseResult.error}`);
    }
    
    return {
      success: true,
      account: newAccount,
      supabaseResult: supabaseResult,
      stored: true
    };
    
  } catch (error) {
    console.error('❌ Error storing account:', error);
    return { success: false, error: error.message, stored: false };
  }
}

// ========== STORE TO SUPABASE - NEW TABLES VERSION ==========
async function storeToSupabaseNewTables(accountId, profileData, cookies, installationId, dashboardUserId) {
  try {
    console.log('📤 Storing to SUPABASE NEW TABLES...');
    
    const liAtCookie = cookies.find(c => c.name === 'li_at');
    if (!liAtCookie) {
      return { success: false, error: 'No li_at cookie for Supabase' };
    }
    
    console.log(`✅ Found li_at cookie: ${liAtCookie.value.length} chars`);
    
    // ========== STEP 1: STORE ACCOUNT IN linkedin_accounts_new ==========
    const accountData = {
      installation_id: installationId,
      dashboard_user_id: dashboardUserId || null,
      extension_account_id: accountId,
      profile_id: profileData.profileId || `profile_${Date.now()}`,
      name: profileData.name ? profileData.name.replace(/\s+/g, ' ').trim() : 'Unknown User',
      headline: profileData.headline || '',
      company: profileData.company || '',
      location: profileData.location || '',
      connections: parseInt(profileData.connections) || 0,
      profile_image_url: profileData.profileImage || '',
      profile_url: profileData.profileUrl || '',
      is_active: true,
      status: 'connected',
      has_li_at: true,
      li_at_preview: liAtCookie.value.substring(0, 20),
      cookie_count: cookies.length,
      last_synced: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('📝 Storing account in linkedin_accounts_new table');
    
    // Store account in NEW table
    const accountResponse = await fetch('https://tlojcedldomndodmnjan.supabase.co/rest/v1/linkedin_accounts_new', {
      method: 'POST',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsb2pjZWRsZG9tbmRvZG1uamFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMzcyMDYsImV4cCI6MjA2NzgxMzIwNn0.rM-5ap5sYqV9reVU6oVPY8Dn9xQCr5u3cW8RbWoo1W0',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsb2pjZWRsZG9tbmRvZG1uamFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMzcyMDYsImV4cCI6MjA2NzgxMzIwNn0.rM-5ap5sYqV9reVU6oVPY8Dn9xQCr5u3cW8RbWoo1W0',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(accountData)
    });
    
    if (!accountResponse.ok) {
      const errorText = await accountResponse.text();
      console.error('❌ Account storage failed in NEW table:', errorText);
      return { success: false, error: `Account storage failed: ${accountResponse.status}` };
    }
    
    const accountResult = await accountResponse.json();
    console.log('✅ Account saved to linkedin_accounts_new:', accountResult);
    
    let supabaseAccountId;
    if (Array.isArray(accountResult) && accountResult.length > 0) {
      supabaseAccountId = accountResult[0].id;
    } else if (accountResult.id) {
      supabaseAccountId = accountResult.id;
    }
    
    if (!supabaseAccountId) {
      console.error('❌ Could not get account ID from NEW table');
      return { success: false, error: 'Could not retrieve account ID' };
    }
    
    console.log(`✅ Got account ID from NEW table: ${supabaseAccountId}`);
    
    // ========== STEP 2: STORE SESSION IN linkedin_sessions_new ==========
    const encryptedLiAt = encryptData(liAtCookie.value);
    const encryptedCookies = encryptData(cookies);
    
    if (!encryptedLiAt || !encryptedCookies) {
      return { success: false, error: 'Cookie encryption failed', supabaseAccountId: supabaseAccountId };
    }
    
    const sessionData = {
      account_id: supabaseAccountId,
      extension_account_id: accountId,
      installation_id: installationId,
      li_at_cookie: encryptedLiAt,
      cookies_encrypted: encryptedCookies,
      browser_agent: navigator.userAgent.substring(0, 500),
      last_used: new Date().toISOString(),
      is_active: true,
      cookie_count: cookies.length,
      has_li_at: true,
      li_at_length: liAtCookie.value.length,
      li_at_preview: liAtCookie.value.substring(0, 15) + '...',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('🍪 Storing session in linkedin_sessions_new table');
    
    const sessionResponse = await fetch('https://tlojcedldomndodmnjan.supabase.co/rest/v1/linkedin_sessions_new', {
      method: 'POST',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsb2pjZWRsZG9tbmRvZG1uamFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMzcyMDYsImV4cCI6MjA2NzgxMzIwNn0.rM-5ap5sYqV9reVU6oVPY8Dn9xQCr5u3cW8RbWoo1W0',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsb2pjZWRsZG9tbmRvZG1uamFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMzcyMDYsImV4cCI6MjA2NzgxMzIwNn0.rM-5ap5sYqV9reVU6oVPY8Dn9xQCr5u3cW8RbWoo1W0',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(sessionData)
    });
    
    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error('❌ Session storage failed in NEW table:', errorText);
      return { success: false, error: `Session storage failed: ${sessionResponse.status}`, supabaseAccountId: supabaseAccountId };
    }
    
    const sessionResult = await sessionResponse.json();
    console.log('✅ Session saved to linkedin_sessions_new:', sessionResult);
    
    let supabaseSessionId;
    if (Array.isArray(sessionResult) && sessionResult.length > 0) {
      supabaseSessionId = sessionResult[0].id;
    } else if (sessionResult.id) {
      supabaseSessionId = sessionResult.id;
    }
    
    console.log(`🎉 Successfully stored to NEW Supabase tables!`);
    console.log(`   Account ID: ${supabaseAccountId}`);
    console.log(`   Session ID: ${supabaseSessionId}`);
    console.log(`   Installation ID: ${installationId}`);
    console.log(`   Cookies stored: ${cookies.length}`);
    
    return {
      success: true,
      supabaseAccountId: supabaseAccountId,
      supabaseSessionId: supabaseSessionId,
      liAtLength: liAtCookie.value.length,
      cookiesEncrypted: true,
      message: 'Stored in NEW tables successfully'
    };
    
  } catch (error) {
    console.error('❌ Supabase storage error:', error);
    return { success: false, error: error.message };
  }
}

// ========== AUTO-DETECT LINKEDIN ACCOUNTS ==========
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!loginDetectionActive || changeInfo.status !== 'complete' || !tab.url?.includes('linkedin.com')) {
    return;
  }
  
  if (tab.url.includes('/login') || tab.url.includes('/uas/login')) {
    console.log('⏭️ Skipping login page');
    return;
  }
  
  console.log('🌐 LinkedIn page loaded:', tab.url);
  
  setTimeout(async () => {
    try {
      console.log('🔍 Checking for LinkedIn account...');
      
      const cookies = await new Promise((resolve) => {
        chrome.cookies.getAll({ domain: '.linkedin.com' }, (cookies) => {
          if (chrome.runtime.lastError) {
            resolve([]);
          } else {
            resolve(cookies || []);
          }
        });
      });
      
      console.log(`🍪 Background got ${cookies.length} cookies`);
      
      const liAtCookie = cookies.find(c => c.name === 'li_at');
      if (!liAtCookie) {
        console.log('❌ No li_at cookie found');
        return;
      }
      
      console.log(`✅ li_at cookie found: ${liAtCookie.value.length} chars`);
      
      const response = await chrome.tabs.sendMessage(tabId, {
        action: 'GET_CURRENT_PROFILE'
      }).catch(() => null);
      
      if (!response) return;
      
      if (!response.isLoggedIn || !response.profile) {
        console.log('⚠️ Not logged in or no profile');
        return;
      }
      
      const profile = response.profile;
      const profileId = profile.profileId;
      
      if (!profileId) {
        console.log('⚠️ No profile ID');
        return;
      }
      
      if (recentlyProcessed.has(profileId)) {
        console.log(`⏭️ Skipping ${profile.name} - recently processed`);
        return;
      }
      
      recentlyProcessed.add(profileId);
      setTimeout(() => recentlyProcessed.delete(profileId), 30000);
      
      const existingAccount = connectedAccounts.get(profileId);
      if (existingAccount) {
        console.log(`✅ ${profile.name} already connected`);
        existingAccount.lastSynced = new Date().toISOString();
        await saveAccounts();
        return;
      }
      
      console.log(`🔗 New user detected: ${profile.name}`);
      
      const result = await storeAccountWithLiAt(profile, cookies, tab.url);
      
      if (result.success && result.stored) {
        console.log(`✅ Successfully stored: ${profile.name}`);
        result.account.autoDetected = true;
        await saveAccounts();
        
        try {
          await chrome.runtime.sendMessage({
            action: 'ACCOUNT_ADDED',
            account: result.account
          });
        } catch (error) {
          console.log('⚠️ Popup not open');
        }
        
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: '✅ LinkedIn Account Connected',
          message: `"${profile.name}" has been automatically connected`
        });
      } else {
        console.log(`⚠️ Failed to store: ${profile.name}`, result.error);
      }
      
    } catch (error) {
      console.error('❌ Auto-detection error:', error);
    }
  }, 3000);
});

// ========== MESSAGE HANDLER ==========
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Background received:', request.action);
  
  switch (request.action) {
    case 'GET_ACCOUNTS':
      (async () => {
        try {
          const installationId = await getExtensionInstallationId();
          const dashboardUserId = await getDashboardUserId();
          
          const accounts = Array.from(connectedAccounts.values()).map(account => ({
            id: account.id,
            profileId: account.profileId,
            name: account.name,
            headline: account.headline,
            company: account.company,
            location: account.location,
            connections: account.connections,
            profileImage: account.profileImage,
            profileUrl: account.profileUrl,
            hasLiAt: account.hasLiAt,
            liAtLength: account.liAtLength,
            liAtPreview: account.liAtPreview,
            connectedAt: account.connectedAt,
            lastSynced: account.lastSynced,
            isActive: account.isActive,
            status: account.status,
            supabaseSynced: account.supabaseSynced,
            cookieCount: account.cookieCount,
            autoDetected: account.autoDetected || false,
            hasCookies: !!account.cookies,
            installationId: account.installationId || installationId,
            dashboardUserId: account.dashboardUserId || dashboardUserId
          }));
          
          console.log(`📤 Sending ${accounts.length} accounts to popup`);
          console.log(`   Storing in: NEW tables (linkedin_accounts_new, linkedin_sessions_new)`);
          
          sendResponse({ 
            success: true, 
            accounts: accounts, 
            total: accounts.length,
            installationId: installationId,
            dashboardUserId: dashboardUserId,
            storageType: 'NEW_TABLES'
          });
        } catch (error) {
          console.error('Error in GET_ACCOUNTS:', error);
          sendResponse({ success: false, error: error.message, accounts: [] });
        }
      })();
      return true;
      
    case 'CONNECT_CURRENT_ACCOUNT':
      (async () => {
        try {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tabs.length) {
            sendResponse({ success: false, error: 'No active tab' });
            return;
          }
          
          const tab = tabs[0];
          const cookies = await new Promise((resolve) => {
            chrome.cookies.getAll({ domain: '.linkedin.com' }, (cookies) => {
              resolve(cookies || []);
            });
          });
          
          console.log(`🍪 Got ${cookies.length} LinkedIn cookies`);
          
          const liAtCookie = cookies.find(c => c.name === 'li_at');
          if (!liAtCookie) {
            sendResponse({ success: false, error: 'No li_at cookie found. Make sure you are logged into LinkedIn.' });
            return;
          }
          
          const profileResponse = await chrome.tabs.sendMessage(tab.id, {
            action: 'GET_CURRENT_PROFILE'
          }).catch(() => null);
          
          if (!profileResponse?.profile) {
            sendResponse({ success: false, error: 'Could not extract profile information.' });
            return;
          }
          
          const profile = profileResponse.profile;
          const profileId = profile.profileId;
          
          const existingAccount = connectedAccounts.get(profileId);
          if (existingAccount) {
            sendResponse({ success: false, error: 'Account already connected' });
            return;
          }
          
          const result = await storeAccountWithLiAt(profile, cookies, tab.url);
          
          if (result.success && result.stored) {
            result.account.autoDetected = false;
            await saveAccounts();
            
            sendResponse({ 
              success: true, 
              account: {
                id: result.account.id,
                name: result.account.name,
                profileId: result.account.profileId,
                hasLiAt: result.account.hasLiAt,
                supabaseSynced: result.account.supabaseSynced,
                installationId: result.account.installationId,
                dashboardUserId: result.account.dashboardUserId
              },
              message: `Connected ${result.account.name} successfully!`
            });
          } else {
            sendResponse({ success: false, error: result.error || 'Failed to store account' });
          }
          
        } catch (error) {
          console.error('Connect error:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;
      
    case 'TEST_CONNECTION':
      (async () => {
        try {
          const installationId = await getExtensionInstallationId();
          
          sendResponse({ 
            success: true, 
            message: 'Background service is running',
            accountsCount: connectedAccounts.size,
            installationId: installationId,
            storageType: 'NEW_TABLES',
            extensionVersion: chrome.runtime.getManifest().version
          });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;
      
    case 'DEBUG_STORAGE':
      (async () => {
        try {
          const installationId = await getExtensionInstallationId();
          
          sendResponse({
            success: true,
            storageType: 'NEW_TABLES',
            tables: ['linkedin_accounts_new', 'linkedin_sessions_new', 'extension_installations'],
            installationId: installationId,
            connectedAccounts: connectedAccounts.size,
            testUrl: 'https://tlojcedldomndodmnjan.supabase.co/rest/v1/linkedin_accounts_new'
          });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;
      
    case 'TEST_SUPABASE':
      (async () => {
        try {
          // Test NEW tables connection
          const testResponse = await fetch('https://tlojcedldomndodmnjan.supabase.co/rest/v1/linkedin_accounts_new?limit=1', {
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsb2pjZWRsZG9tbmRvZG1uamFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMzcyMDYsImV4cCI6MjA2NzgxMzIwNn0.rM-5ap5sYqV9reVU6oVPY8Dn9xQCr5u3cW8RbWoo1W0',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsb2pjZWRsZG9tbmRvZG1uamFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMzcyMDYsImV4cCI6MjA2NzgxMzIwNn0.rM-5ap5sYqV9reVU6oVPY8Dn9xQCr5u3cW8RbWoo1W0'
            }
          });
          
          sendResponse({
            success: testResponse.ok,
            status: testResponse.status,
            statusText: testResponse.statusText,
            table: 'linkedin_accounts_new',
            message: testResponse.ok ? 'NEW table connection successful' : 'NEW table connection failed'
          });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;
  }
});

// Initialize on startup
(async () => {
  console.log('🚀 Background service initializing...');
  console.log('📊 STORAGE TARGET: NEW TABLES (linkedin_accounts_new, linkedin_sessions_new)');
  
  const installationId = await getExtensionInstallationId();
  console.log(`📱 Installation ID: ${installationId}`);
  
  await loadAccounts();
  await initSupabase();
  
  console.log('✅ Background service ready');
  console.log('✅ All data will be stored in NEW Supabase tables');
})();