// content.js - COMPLETE VERSION with LinkedIn scraping + Dashboard detection
console.log('🔧 360airo LinkedIn Connector content script LOADED on:', window.location.href);

// ========== CONFIGURATION ==========
const DASHBOARD_DOMAINS = ['localhost', '360airo.com', 'your-domain.com'];
const EXTENSION_VERSION = '1.0.0';

// ========== GLOBAL STATE ==========
let isInitialized = false;
let lastProfileData = null;

// ========== DASHBOARD DETECTION ==========
function isDashboardPage() {
  return DASHBOARD_DOMAINS.some(domain => 
    window.location.hostname.includes(domain)
  );
}

// ========== LISTEN FOR DASHBOARD MESSAGES ==========
window.addEventListener('message', function(event) {
  // Safety check
  if (!event.data || typeof event.data !== 'object') return;
  
  console.log('📨 Content script received message:', event.data.type);
  
  // ========== DASHBOARD PING/PONG ==========
  if (event.data.type === '360AIRO_EXTENSION_PING' && 
      event.data.source === '360airo-dashboard') {
    
    console.log('✅ Responding to dashboard ping from:', event.origin);
    
    // Send response back
    window.postMessage({
      type: '360AIRO_EXTENSION_RESPONSE',
      messageId: event.data.messageId,
      installed: true,
      version: EXTENSION_VERSION,
      name: '360airo LinkedIn Connector',
      extensionId: chrome.runtime.id,
      timestamp: Date.now(),
      source: '360airo-extension'
    }, '*');
  }
  
  // ========== TOKEN SAVING ==========
  if (event.data.type === '360AIRO_SAVE_TOKEN' && 
      event.data.source === '360airo-dashboard') {
    
    console.log('🔑 Saving token from dashboard');
    
    chrome.storage.local.set({ 
      dashboardToken: event.data.token,
      tokenSavedAt: new Date().toISOString(),
      dashboardUrl: event.origin
    }, () => {
      // Confirm back to dashboard
      window.postMessage({
        type: '360AIRO_TOKEN_SAVED',
        messageId: event.data.messageId,
        success: true,
        timestamp: Date.now()
      }, '*');
    });
  }
  
  // ========== GET PROFILE DATA ==========
  if (event.data.type === '360AIRO_GET_PROFILE' && 
      event.data.source === '360airo-dashboard') {
    
    console.log('👤 Dashboard requesting LinkedIn profile');
    
    if (window.location.hostname.includes('linkedin.com')) {
      try {
        const profile = extractProfileData();
        const cookies = getLinkedInCookies();
        const hasLiAt = cookies.some(c => c.name === 'li_at');
        
        window.postMessage({
          type: '360AIRO_PROFILE_DATA',
          messageId: event.data.messageId,
          profile: profile,
          cookies: cookies,
          hasLiAt: hasLiAt,
          cookieCount: cookies.length,
          timestamp: new Date().toISOString(),
          source: '360airo-extension'
        }, '*');
      } catch (error) {
        window.postMessage({
          type: '360AIRO_PROFILE_DATA',
          messageId: event.data.messageId,
          error: error.message,
          timestamp: new Date().toISOString()
        }, '*');
      }
    } else {
      window.postMessage({
        type: '360AIRO_PROFILE_DATA',
        messageId: event.data.messageId,
        error: 'Not on LinkedIn page',
        timestamp: new Date().toISOString()
      }, '*');
    }
  }
});

// ========== AUTO-ANNOUNCE TO DASHBOARD ==========
function announceToDashboard() {
  if (isDashboardPage()) {
    console.log('🎯 On dashboard page, announcing extension presence');
    
    // Set global variable for quick detection
    window._360airoExtension = {
      installed: true,
      version: EXTENSION_VERSION,
      name: '360airo LinkedIn Connector',
      id: chrome.runtime.id,
      ping: () => 'pong',
      getProfile: () => extractProfileData(),
      getCookies: () => getLinkedInCookies(),
      getInfo: () => ({
        version: EXTENSION_VERSION,
        id: chrome.runtime.id,
        manifest: chrome.runtime.getManifest()
      })
    };
    
    // Send announcement
    window.postMessage({
      type: '360AIRO_EXTENSION_ANNOUNCE',
      installed: true,
      version: EXTENSION_VERSION,
      name: '360airo LinkedIn Connector',
      extensionId: chrome.runtime.id,
      timestamp: Date.now(),
      source: '360airo-extension'
    }, '*');
    
    console.log('✅ Extension announced to dashboard');
  }
}

// ========== INITIALIZE DASHBOARD DETECTION ==========
function initializeDashboardDetection() {
  console.log('🎯 Initializing dashboard detection');
  
  // Announce immediately
  announceToDashboard();
  
  // Also announce after page loads completely
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(announceToDashboard, 1000);
    });
  } else {
    setTimeout(announceToDashboard, 1000);
  }
  
  console.log('✅ Dashboard detection ready');
}

// ========== COOKIE EXTRACTION (DOCUMENT.COOKIE ONLY) ==========
function getLinkedInCookies() {
  try {
    console.log('🍪 Getting cookies from document.cookie...');
    
    const cookies = [];
    const cookieString = document.cookie;
    
    if (!cookieString) {
      console.log('⚠️ No cookies in document.cookie');
      return [];
    }
    
    // Parse cookies from document.cookie
    cookieString.split(';').forEach(cookie => {
      const trimmedCookie = cookie.trim();
      const equalsIndex = trimmedCookie.indexOf('=');
      
      if (equalsIndex > 0) {
        const name = trimmedCookie.substring(0, equalsIndex);
        const value = trimmedCookie.substring(equalsIndex + 1);
        
        if (name && value) {
          // Only check for important LinkedIn cookies
          if (name === 'li_at' || name === 'JSESSIONID' || name === 'bcookie' || name === 'lang') {
            cookies.push({
              name: name,
              value: decodeURIComponent(value),
              domain: window.location.hostname,
              path: '/',
              secure: window.location.protocol === 'https:',
              httpOnly: false,
              sameSite: 'lax',
              source: 'document',
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    });
    
    // Check for li_at
    const liAtCookie = cookies.find(c => c.name === 'li_at');
    if (liAtCookie) {
      console.log(`🔐 li_at found: ${liAtCookie.value.substring(0, 10)}... (${liAtCookie.value.length} chars)`);
    } else {
      console.log('⚠️ No li_at cookie found');
    }
    
    console.log(`✅ Found ${cookies.length} cookies`);
    return cookies;
    
  } catch (error) {
    console.error('Cookie extraction error:', error);
    return [];
  }
}

// ========== PROFILE EXTRACTION ==========
function extractProfileData() {
  try {
    console.log('🔍 Extracting profile data...');
    
    const data = {
      name: '',
      headline: '',
      location: '',
      company: '',
      connections: 0,
      profileUrl: window.location.href,
      profileImage: '',
      profileId: '',
      timestamp: new Date().toISOString(),
      source: 'content-script'
    };
    
    // Extract name
    const nameSelectors = [
      'h1.text-heading-xlarge',
      'h1.profile-top-card-person__name',
      'h1.top-card-layout__title',
      '.artdeco-entity-lockup__title',
      'h1[data-test-profile-identity-name]',
      '.profile-topcard-person-entity__name'
    ];
    
    for (const selector of nameSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        data.name = element.textContent.trim();
        if (data.name) {
          console.log(`✅ Found name: ${data.name}`);
          break;
        }
      }
    }
    
    // Extract headline
    const headlineSelectors = [
      '.text-body-medium.break-words',
      '.profile-top-card-person__headline',
      '.top-card-layout__headline',
      '.mt1.t-18.t-black.t-normal'
    ];
    
    for (const selector of headlineSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        data.headline = element.textContent.trim();
        if (data.headline) break;
      }
    }
    
    // Extract location
    const locationSelectors = [
      '.pv-top-card-section__location',
      '.profile-top-card-person__location',
      'span.t-16.t-black.t-normal.inline-block',
      '.top-card-layout__location'
    ];
    
    for (const selector of locationSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        data.location = element.textContent.trim();
        if (data.location) break;
      }
    }
    
    // Extract company
    const companySelectors = [
      'div.pv-text-details__left-panel span:first-child',
      '.profile-top-card-person__current-company',
      '[data-test="current-company"]',
      '.top-card-layout__company'
    ];
    
    for (const selector of companySelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        data.company = element.textContent.trim().split('·')[0].trim();
        if (data.company) break;
      }
    }
    
    // Extract connections
    const connectionSelectors = [
      '.pv-top-card--list-bullet li:first-child',
      '.t-bold:contains("connections")',
      '.profile-top-card-person__connections'
    ];
    
    for (const selector of connectionSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        const text = element.textContent.trim();
        const match = text.match(/\d+/g);
        if (match) {
          data.connections = parseInt(match[0], 10) || 0;
          break;
        }
      }
    }
    
    // Extract profile image
    const imageSelectors = [
      'img.pv-top-card-profile-picture__image',
      'img.profile-photo-edit__preview',
      'img[data-delayed-url*="profile-displayphoto"]',
      'img.top-card-profile-picture__image'
    ];
    
    for (const selector of imageSelectors) {
      const img = document.querySelector(selector);
      if (img) {
        const src = img.getAttribute('src') || 
                    img.getAttribute('data-delayed-url') || 
                    img.getAttribute('data-src') ||
                    img.getAttribute('srcset')?.split(',')[0];
        if (src && src.includes('http')) {
          data.profileImage = src.split('?')[0]; // Remove query params
          break;
        }
      }
    }
    
    // Generate profile ID
    if (data.name) {
      data.profileId = data.name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .substring(0, 50);
    } else if (window.location.href.includes('/in/')) {
      const urlMatch = window.location.href.match(/\/in\/([^\/?]+)/);
      if (urlMatch) {
        data.profileId = urlMatch[1];
      } else {
        data.profileId = 'profile_' + Date.now();
      }
    } else {
      data.profileId = 'profile_' + Date.now();
    }
    
    // Cache the profile
    lastProfileData = data;
    
    console.log('📊 Extracted profile:', { 
      name: data.name, 
      profileId: data.profileId,
      company: data.company 
    });
    
    return data;
    
  } catch (error) {
    console.error('Profile extraction error:', error);
    return null;
  }
}

// ========== CHECK LOGIN STATUS ==========
function checkIfLoggedIn() {
  try {
    // Method 1: Check for li_at cookie
    const cookieString = document.cookie;
    const hasLiAtCookie = cookieString.includes('li_at=');
    
    // Method 2: Check LinkedIn UI elements
    const loggedInSelectors = [
      'nav.global-nav',
      '.global-nav__me',
      '.feed-identity-module',
      'button.global-nav__primary-link--icon',
      '.scaffold-layout__main',
      '.global-nav__me-photo',
      '.feed-identity-module__actor-meta'
    ];
    
    const isLoggedInUI = loggedInSelectors.some(selector => {
      const element = document.querySelector(selector);
      return element !== null;
    });
    
    const isLoggedIn = hasLiAtCookie || isLoggedInUI;
    
    console.log('🔐 Login check:', { 
      hasLiAtCookie: hasLiAtCookie, 
      isLoggedInUI: isLoggedInUI,
      isLoggedIn: isLoggedIn 
    });
    
    return isLoggedIn;
    
  } catch (error) {
    console.error('Login check error:', error);
    return false;
  }
}

// ========== PROFILE CHECK ==========
function checkAndExtractProfile() {
  try {
    console.log('🔍 Auto-checking for profile...');
    
    const isLoggedIn = checkIfLoggedIn();
    if (!isLoggedIn) {
      console.log('⚠️ Not logged in, skipping auto-extraction');
      return;
    }
    
    const profile = extractProfileData();
    if (!profile || !profile.name) {
      console.log('⚠️ No profile found in auto-extraction');
      return;
    }
    
    const cookies = getLinkedInCookies();
    const hasLiAt = cookies.some(c => c.name === 'li_at');
    
    console.log('✅ Auto-found profile:', profile.name);
    
    // Send to background script
    chrome.runtime.sendMessage({
      action: 'PROFILE_SCRAPED',
      profile: profile,
      cookies: cookies,
      hasLiAt: hasLiAt,
      timestamp: new Date().toISOString(),
      url: window.location.href
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('⚠️ Send to background error:', chrome.runtime.lastError.message);
      } else {
        console.log('✅ Profile sent to background');
      }
    });
    
  } catch (error) {
    console.error('Auto-profile check error:', error);
  }
}

// ========== BACKGROUND MESSAGE HANDLER ==========
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Content script received background message:', request.action);
  
  switch (request.action) {
    case 'PING':
      sendResponse({ 
        pong: true, 
        timestamp: new Date().toISOString(),
        location: window.location.href 
      });
      return true;
      
    case 'GET_CURRENT_PROFILE':
      (() => {
        try {
          console.log('🔍 Background requesting profile...');
          
          const isLoggedIn = checkIfLoggedIn();
          
          if (!isLoggedIn) {
            sendResponse({
              isLoggedIn: false,
              profile: null,
              cookies: [],
              hasLiAt: false,
              message: 'Not logged into LinkedIn'
            });
            return;
          }
          
          const profile = extractProfileData();
          
          if (!profile) {
            sendResponse({
              isLoggedIn: true,
              profile: null,
              cookies: [],
              hasLiAt: false,
              message: 'Could not extract profile'
            });
            return;
          }
          
          const cookies = getLinkedInCookies();
          const hasLiAt = cookies.some(c => c.name === 'li_at');
          
          console.log('📦 Sending profile to background:', profile.name);
          
          sendResponse({
            isLoggedIn: true,
            profile: profile,
            cookies: cookies,
            hasLiAt: hasLiAt,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            cookieCount: cookies.length,
            liAtLength: hasLiAt ? cookies.find(c => c.name === 'li_at').value.length : 0
          });
          
        } catch (error) {
          console.error('GET_CURRENT_PROFILE error:', error);
          sendResponse({
            isLoggedIn: false,
            profile: null,
            cookies: [],
            hasLiAt: false,
            error: error.message
          });
        }
      })();
      return true;
      
    case 'FORCE_EXTRACT':
      const profile = extractProfileData();
      sendResponse({ profile: profile });
      return true;
      
    case 'CHECK_STATUS':
      const status = checkIfLoggedIn();
      sendResponse({ loggedIn: status });
      return true;
      
    case 'GET_PROFILE_DATA':
      const profileData = extractProfileData();
      sendResponse({ profile: profileData });
      return true;
      
    case 'CHECK_IF_LOGGED_IN':
      const loggedIn = checkIfLoggedIn();
      sendResponse({ loggedIn: loggedIn });
      return true;
  }
});

// ========== INITIALIZE BASED ON PAGE TYPE ==========
function initializeContentScript() {
  if (isInitialized) return;
  
  console.log('🔧 Initializing content script for:', window.location.href);
  
  // Always set global functions for dashboard
  setupGlobalFunctions();
  
  if (window.location.hostname.includes('linkedin.com')) {
    console.log('🌐 Initializing LinkedIn features...');
    initializeLinkedInFeatures();
  }
  
  if (isDashboardPage()) {
    console.log('📊 Initializing dashboard detection...');
    initializeDashboardDetection();
  }
  
  isInitialized = true;
}

// ========== LINKEDIN INITIALIZATION ==========
function initializeLinkedInFeatures() {
  // Test connection to background
  setTimeout(() => {
    chrome.runtime.sendMessage({ 
      action: 'CONTENT_SCRIPT_READY',
      url: window.location.href,
      timestamp: new Date().toISOString()
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('⚠️ Background connection error:', chrome.runtime.lastError.message);
      } else {
        console.log('✅ Content script ready message sent');
      }
    });
    
    // Start profile extraction
    checkAndExtractProfile();
  }, 2000);
}

// ========== GLOBAL FUNCTIONS ==========
function setupGlobalFunctions() {
  // For dashboard to call directly
  window.is360airoExtensionInstalled = function() {
    return true;
  };
  
  window.get360airoExtensionInfo = function() {
    return {
      installed: true,
      version: EXTENSION_VERSION,
      name: '360airo LinkedIn Connector',
      id: chrome.runtime.id,
      manifest: chrome.runtime.getManifest()
    };
  };
  
  window.getLinkedInProfile = function() {
    if (window.location.hostname.includes('linkedin.com')) {
      return {
        profile: extractProfileData(),
        cookies: getLinkedInCookies(),
        timestamp: new Date().toISOString()
      };
    }
    return { error: 'Not on LinkedIn page' };
  };
  
  window.ping360airoExtension = function() {
    return { pong: true, timestamp: Date.now() };
  };
  
  console.log('✅ Global functions setup complete');
}

// ========== STARTUP ==========
// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}

// Monitor URL changes
let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    console.log('📍 URL changed to:', lastUrl);
    
    // Reset for new page
    isInitialized = false;
    
    setTimeout(() => {
      initializeContentScript();
    }, 1000);
  }
});

observer.observe(document, { subtree: true, childList: true });

// Manual trigger after 3 seconds (fallback)
setTimeout(() => {
  if (!isInitialized && 
      (window.location.hostname.includes('linkedin.com') || isDashboardPage())) {
    console.log('🔄 Manual initialization trigger');
    initializeContentScript();
  }
}, 3000);

console.log('✅ Content script fully loaded and ready');