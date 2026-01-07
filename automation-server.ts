// automation-server.ts - Complete LinkedIn Automation Server
import { executablePath } from 'puppeteer';
import express, { Request, Response } from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer-extra';
import { Browser, Page, Mouse, ElementHandle } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import randomUseragent from 'random-useragent';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ==================== TYPE DEFINITIONS ====================

interface LinkedInAccountNew {
  id: number;
  name: string;
  headline: string | null;
  is_active: boolean;
  has_li_at: boolean;
  profile_image_url: string | null;
  profile_url: string | null;
  last_synced: string | null;
  daily_limit: number;
  installation_id: string;
  dashboard_user_id: string;
  created_at: string;
}

interface LinkedInSessionEncrypted {
  id: number;
  account_id: number;
  li_at_cookie: string;
  cookies_encrypted: string;
  has_li_at: boolean;
  is_active: boolean;
  created_at: string;
  installation_id: string;
  browser_agent?: string;
  last_used?: string;
  cookie_count?: number;
  li_at_length?: number;
  li_at_preview?: string;
  updated_at?: string;
}

interface AutomationRequest {
  account_id: number;
  profile_url: string;
  connection_note?: string;
}

interface AutomationResponse {
  success: boolean;
  automationId?: string;
  message?: string;
  account?: string;
  target?: string;
  error?: string;
}

interface HealthResponse {
  status: string;
  timestamp: string;
  activeBrowsers: number;
}

interface BrowserInstance {
  id: string;
  browser: any;
  startedAt: Date;
  accountId: number;
  status: 'running' | 'completed' | 'error';
}

interface ActiveAutomation {
  id: string;
  isConnected: boolean;
  status: 'running' | 'completed' | 'error';
  uptime: number;
  accountId: number;
}

interface ActiveResponse {
  activeAutomations: ActiveAutomation[];
  count: number;
  timestamp: string;
}

interface AutomationLogUpdate {
  accountId: number;
  profileUrl: string;
  status: 'sent' | 'failed' | 'processing';
  errorMessage?: string | null;
}

interface Point {
  x: number;
  y: number;
}

// ==================== UTILITY FUNCTIONS ====================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== FIXED COOKIE DECRYPTION ====================

class CookieDecryptor {
  /**
   * Extract and decode LinkedIn li_at cookie from encrypted data
   */
  static extractLiAtCookie(cookiesEncrypted: string): string | null {
    console.log('\n🎯 [CookieDecryptor.extractLiAtCookie] STARTING EXTRACTION');
    console.log('='.repeat(70));
    
    if (!cookiesEncrypted) {
      console.log('❌ No cookie data provided');
      return null;
    }
    
    try {
      // ====== STEP 1: Handle URL encoding (your data is URL encoded) ======
      console.log(`📊 Input length: ${cookiesEncrypted.length} chars`);
      console.log(`🔍 Input preview: ${cookiesEncrypted.substring(0, 100)}...`);
      
      let decodedData = cookiesEncrypted;
      
      // Check if it's URL encoded (contains % symbols)
      if (cookiesEncrypted.includes('%')) {
        try {
          decodedData = decodeURIComponent(cookiesEncrypted);
          console.log('✅ Successfully URL decoded');
          console.log(`📊 Decoded length: ${decodedData.length} chars`);
          console.log(`🔍 Decoded preview: ${decodedData.substring(0, 100)}...`);
        } catch (e) {
          console.log('⚠️ URL decode failed, using raw data');
        }
      }
      
      // ====== STEP 2: Try to parse as JSON array/object ======
      if (decodedData.startsWith('[') || decodedData.startsWith('{')) {
        console.log('🔄 Trying to parse as JSON...');
        try {
          const cookies = JSON.parse(decodedData);
          console.log(`✅ JSON parsed successfully. Type: ${Array.isArray(cookies) ? 'Array' : 'Object'}`);
          
          if (Array.isArray(cookies)) {
            console.log(`🔍 Searching through ${cookies.length} cookies...`);
            
            // Look for li_at cookie in the array
            for (const cookie of cookies) {
              if (cookie.name && cookie.name.toLowerCase().includes('li_at') && cookie.value) {
                console.log(`✅ Found li_at in JSON array`);
                console.log(`   Name: ${cookie.name}`);
                console.log(`   Value length: ${cookie.value.length}`);
                console.log(`   Value preview: ${cookie.value.substring(0, 30)}...`);
                console.log(`   Starts with AQED: ${cookie.value.startsWith('AQED')}`);
                
                // Check if the value is Base64 encoded
                if (!cookie.value.startsWith('AQED')) {
                  try {
                    const decodedValue = Buffer.from(cookie.value, 'base64').toString('utf-8');
                    if (decodedValue.startsWith('AQED')) {
                      console.log('✅ Base64 decoded li_at value');
                      return decodedValue;
                    }
                  } catch (e) {
                    console.log('⚠️ Not Base64 encoded');
                  }
                }
                return cookie.value;
              }
            }
          }
        } catch (e: any) {
  console.log('❌ JSON parse failed:', e.message);
     }
      }
      
      // ====== STEP 3: Try direct regex patterns ======
      console.log('🔄 Trying direct pattern matching...');
      
      const patterns = [
        // JSON pattern: "li_at":"AQED..."
        /"li_at"\s*:\s*"([^"]+)"/,
        // JSON pattern: 'li_at':'AQED...'
        /'li_at'\s*:\s*'([^']+)'/,
        // Cookie header pattern: li_at=AQED...
        /li_at=([^;,\s]+)/,
        // Direct AQED pattern (li_at always starts with AQED)
        /(AQED[^"'\s]{100,})/
      ];
      
      for (const [index, pattern] of patterns.entries()) {
        const match = decodedData.match(pattern);
        if (match) {
          let cookieValue = match[1] || match[0];
          console.log(`✅ Pattern ${index} matched: ${cookieValue.substring(0, 30)}...`);
          
          // Clean up the value
          cookieValue = cookieValue.replace(/"/g, '').replace(/'/g, '').trim();
          
          // Check if it's Base64 encoded
          if (cookieValue.length > 100 && !cookieValue.startsWith('AQED')) {
            try {
              const decoded = Buffer.from(cookieValue, 'base64').toString('utf-8');
              if (decoded.startsWith('AQED')) {
                console.log('✅ Base64 decoded successfully');
                return decoded;
              }
            } catch (e) {
              console.log('⚠️ Not Base64 encoded');
            }
          }
          
          if (cookieValue.startsWith('AQED') && cookieValue.length > 100) {
            console.log(`✅ Valid li_at cookie found (${cookieValue.length} chars)`);
            return cookieValue;
          }
        }
      }
      
      console.log('❌ Could not extract li_at cookie by any method');
      console.log('='.repeat(70));
      return null;
      
    } catch (error: any) {
      console.error('❌ Cookie extraction error:', error.message);
      console.log('='.repeat(70));
      return null;
    }
  }
  
  /**
   * Extract JSESSIONID for LinkedIn
   */
  static extractJSessionId(cookiesEncrypted: string): string | null {
    console.log('\n🔑 [CookieDecryptor.extractJSessionId] STARTING EXTRACTION');
    
    try {
      // Try URL decode first
      let decodedData = cookiesEncrypted;
      if (cookiesEncrypted.includes('%')) {
        try {
          decodedData = decodeURIComponent(cookiesEncrypted);
          console.log('✅ URL decoded for JSESSIONID search');
        } catch (e) {
          console.log('⚠️ URL decode failed');
        }
      }
      
      // Try JSON parse
      if (decodedData.startsWith('[') || decodedData.startsWith('{')) {
        try {
          const cookies = JSON.parse(decodedData);
          if (Array.isArray(cookies)) {
            for (const cookie of cookies) {
              if (cookie.name && cookie.name.toUpperCase().includes('JSESSIONID') && cookie.value) {
                let value = cookie.value;
                // Remove "ajax:" prefix if present
                if (value.startsWith('ajax:')) {
                  value = value.substring(5);
                }
                console.log(`✅ Found JSESSIONID in JSON: ${value.substring(0, 20)}...`);
                return value;
              }
            }
          }
        } catch (e) {
          console.log('❌ JSON parse failed for JSESSIONID');
        }
      }
      
      // Try patterns
      const patterns = [
        /"JSESSIONID"\s*:\s*"([^"]+)"/,
        /'JSESSIONID'\s*:\s*'([^']+)'/,
        /JSESSIONID=([^;,\s]+)/,
        /"ajax":"([^"]+)"/
      ];
      
      for (const [index, pattern] of patterns.entries()) {
        const match = decodedData.match(pattern);
        if (match && match[1]) {
          let value = match[1].replace(/"/g, '').replace(/'/g, '').trim();
          if (value.startsWith('ajax:')) {
            value = value.substring(5);
          }
          if (value.length > 10) {
            console.log(`✅ Pattern ${index} matched JSESSIONID: ${value.substring(0, 20)}...`);
            return value;
          }
        }
      }
      
      console.log('❌ Could not extract JSESSIONID');
      return null;
    } catch (error) {
      console.error('Error extracting JSESSIONID:', error);
      return null;
    }
  }
  
  /**
   * Parse ALL cookies from encrypted data
   */
  static parseAllCookies(cookiesEncrypted: string): any[] {
    console.log('\n📦 [CookieDecryptor.parseAllCookies] PARSING ALL COOKIES');
    
    try {
      if (!cookiesEncrypted) {
        return [];
      }
      
      // Try URL decode
      let decodedData = cookiesEncrypted;
      if (cookiesEncrypted.includes('%')) {
        try {
          decodedData = decodeURIComponent(cookiesEncrypted);
          console.log('✅ URL decoded successfully');
        } catch (e) {
          console.log('⚠️ URL decode failed');
        }
      }
      
      // Try JSON parse
      if (decodedData.startsWith('[') || decodedData.startsWith('{')) {
        try {
          const cookies = JSON.parse(decodedData);
          console.log(`✅ Parsed ${Array.isArray(cookies) ? cookies.length : 1} cookies from JSON`);
          
          if (Array.isArray(cookies)) {
            // Decode any Base64 values in li_at cookies
            return cookies.map(cookie => {
              if (cookie.value && !cookie.value.startsWith('AQED') && cookie.name?.toLowerCase().includes('li_at')) {
                try {
                  const decoded = Buffer.from(cookie.value, 'base64').toString('utf-8');
                  if (decoded.startsWith('AQED')) {
                    console.log(`✅ Decoded Base64 li_at cookie`);
                    cookie.value = decoded;
                  }
                } catch (e) {
                  // Not Base64
                }
              }
              return cookie;
            });
          }
          return [cookies];
  } catch (e: any) {
  console.log('❌ JSON parse failed:', e.message);
}
      }
      
      console.log('❌ Could not parse cookies as JSON');
      return [];
    } catch (error) {
      console.error('Error parsing cookies:', error);
      return [];
    }
  }
  
  /**
   * Validate cookie data
   */
  static validateCookies(cookiesEncrypted: string): boolean {
    if (!cookiesEncrypted || cookiesEncrypted.trim().length === 0) {
      return false;
    }
    
    // Check for LinkedIn cookie indicators
    const hasLiAt = cookiesEncrypted.toLowerCase().includes('li_at');
    const hasAQED = cookiesEncrypted.includes('AQED');
    const looksLikeJson = cookiesEncrypted.includes('"name"') || cookiesEncrypted.includes('"value"');
    const isUrlEncoded = cookiesEncrypted.includes('%');
    const hasBracket = cookiesEncrypted.includes('[') || cookiesEncrypted.includes('{');
    
    console.log('🔍 Cookie validation:');
    console.log(`  Has "li_at": ${hasLiAt}`);
    console.log(`  Has "AQED": ${hasAQED}`);
    console.log(`  Looks like JSON: ${looksLikeJson}`);
    console.log(`  Is URL encoded: ${isUrlEncoded}`);
    console.log(`  Has brackets: ${hasBracket}`);
    
    return hasLiAt || hasAQED || looksLikeJson || isUrlEncoded || hasBracket;
  }
  
  /**
   * Decode Base64 li_at cookie if needed
   */
  static decodeLiAtCookie(liAtCookie: string): string {
    if (!liAtCookie) return liAtCookie;
    
    // If it already starts with AQED, it's already decoded
    if (liAtCookie.startsWith('AQED')) {
      return liAtCookie;
    }
    
    // Try Base64 decode
    try {
      const decoded = Buffer.from(liAtCookie, 'base64').toString('utf-8');
      if (decoded.startsWith('AQED')) {
        console.log(`✅ Successfully Base64 decoded li_at cookie`);
        return decoded;
      }
    } catch (e) {
      console.log('⚠️ li_at cookie is not Base64 encoded');
    }
    
    return liAtCookie;
  }
}

// Human Cursor Simulation
class HumanCursor {
  private page: Page;
  private mouse: Mouse;
  private currentPosition: Point = { x: 0, y: 0 };

  constructor(page: Page) {
    this.page = page;
    this.mouse = page.mouse;
  }

  private randomDelay(min: number = 100, max: number = 300): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private bezierCurve(start: Point, end: Point, controlPoints: number = 20): Point[] {
    const points: Point[] = [];
    
    for (let i = 0; i <= controlPoints; i++) {
      const t = i / controlPoints;
      
      const x = start.x * Math.pow(1 - t, 3) + 
                (start.x + Math.random() * 50) * 3 * Math.pow(1 - t, 2) * t + 
                (end.x - Math.random() * 50) * 3 * (1 - t) * Math.pow(t, 2) + 
                end.x * Math.pow(t, 3);
      
      const y = start.y * Math.pow(1 - t, 3) + 
                (start.y + Math.random() * 50) * 3 * Math.pow(1 - t, 2) * t + 
                (end.y - Math.random() * 50) * 3 * (1 - t) * Math.pow(t, 2) + 
                end.y * Math.pow(t, 3);
      
      points.push({ x, y });
    }
    
    return points;
  }

  async moveTo(x: number, y: number): Promise<void> {
    const points = this.bezierCurve(this.currentPosition, { x, y });
    
    for (const point of points) {
      await this.mouse.move(point.x, point.y);
      await sleep(this.randomDelay(10, 30));
      this.currentPosition = { x: point.x, y: point.y };
    }
  }

  async click(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    await this.moveTo(x, y);
    await sleep(this.randomDelay(200, 500));
    await this.mouse.click(x, y, { button });
    await sleep(this.randomDelay(100, 300));
    this.currentPosition = { x, y };
  }

  async humanType(element: ElementHandle<Element>, text: string): Promise<void> {
    const typingSpeed = 30 + Math.random() * 70;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (Math.random() < 0.03) {
        const typoChar = this.getRandomTypoChar(char);
        await element.type(typoChar, { delay: typingSpeed });
        await sleep(200 + Math.random() * 300);
        await element.press('Backspace');
        await sleep(100 + Math.random() * 200);
      }
      
      await element.type(char, { delay: typingSpeed });
      
      if (char === ' ' && Math.random() < 0.3) {
        await sleep(300 + Math.random() * 500);
      }
    }
  }

  private getRandomTypoChar(originalChar: string): string {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    const nearbyKeys: { [key: string]: string[] } = {
      'a': ['q', 'w', 's', 'z'],
      's': ['a', 'w', 'e', 'd', 'x', 'z'],
      'd': ['s', 'e', 'r', 'f', 'c', 'x'],
      'f': ['d', 'r', 't', 'g', 'v', 'c'],
      'g': ['f', 't', 'y', 'h', 'b', 'v']
    };
    
    const lowerChar = originalChar.toLowerCase();
    if (nearbyKeys[lowerChar] && Math.random() < 0.5) {
      const nearby = nearbyKeys[lowerChar];
      return nearby[Math.floor(Math.random() * nearby.length)];
    }
    
    return alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  async randomWander(viewportWidth: number, viewportHeight: number): Promise<void> {
    const wanderPoints = 3 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < wanderPoints; i++) {
      const x = 100 + Math.random() * (viewportWidth - 200);
      const y = 100 + Math.random() * (viewportHeight - 200);
      await this.moveTo(x, y);
      await sleep(300 + Math.random() * 700);
    }
  }
}

// ==================== MAIN SERVER CODE ====================

// Use stealth plugin
puppeteer.use(StealthPlugin());

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Store active browser instances
const activeBrowsers: Map<string, BrowserInstance> = new Map();

// ==================== HELPER FUNCTIONS ====================

async function updateAutomationLog(update: AutomationLogUpdate): Promise<void> {
  try {
    const { data: logs } = await supabase
      .from('automation_logs')
      .select('id')
      .eq('account_id', update.accountId)
      .eq('profile_url', update.profileUrl)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (logs && logs.length > 0) {
      await supabase
        .from('automation_logs')
        .update({
          status: update.status,
          error_message: update.errorMessage || null,
          completed_at: new Date().toISOString()
        })
        .eq('id', logs[0].id);
      
      console.log(`📝 Updated log for account ${update.accountId}, status: ${update.status}`);
    }
  } catch (error: any) {
    console.error('Error updating log:', error.message);
  }
}

async function simulateHumanBrowsing(page: Page, humanCursor: HumanCursor): Promise<void> {
  console.log('👤 Simulating human browsing...');
  
  const scrollCount = 2 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < scrollCount; i++) {
    const scrollAmount = 200 + Math.random() * 400;
    const scrollDirection = Math.random() > 0.3 ? 'down' : 'up';
    
    await page.evaluate((amount: number, direction: string) => {
      window.scrollBy({
        top: direction === 'down' ? amount : -amount,
        behavior: 'smooth'
      });
    }, scrollAmount, scrollDirection);
    
    await sleep(1000 + Math.random() * 2000);
    
    if (Math.random() > 0.5) {
      const viewport = page.viewport();
      if (viewport) {
        await humanCursor.randomWander(viewport.width, viewport.height);
      }
    }
  }
  
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  
  await sleep(1000 + Math.random() * 1500);
}

async function handleConnectionRequest(
  page: Page, 
  humanCursor: HumanCursor, 
  connectionNote?: string
): Promise<boolean> {
  console.log('🔍 Looking for Connect button...');
  
  const connectSelectors = [
    'button[aria-label*="Connect"]',
    'button:has-text("Connect")',
    'button[aria-label*="Invite"]',
    '.pv-s-profile-actions button',
    'button.artdeco-button--primary',
    'button[data-control-name="connect"]'
  ];
  
  let connectButton = null;
  let connectButtonPosition = null;
  
  for (const selector of connectSelectors) {
    try {
      connectButton = await page.$(selector);
      if (connectButton) {
        connectButtonPosition = await connectButton.boundingBox();
        console.log(`🎯 Found Connect button with selector: ${selector}`);
        break;
      }
    } catch (error) {
      continue;
    }
  }
  
  if (!connectButton || !connectButtonPosition) {
    console.log('⚠️ Connect button not found');
    const followButton = await page.$('button[aria-label*="Follow"]');
    if (followButton) {
      throw new Error('Profile only allows "Follow", not "Connect"');
    }
    throw new Error('Connect button not found on profile');
  }
  
  console.log(`🎯 Clicking Connect button at (${connectButtonPosition.x}, ${connectButtonPosition.y})`);
  
  await humanCursor.click(
    connectButtonPosition.x + connectButtonPosition.width / 2,
    connectButtonPosition.y + connectButtonPosition.height / 2
  );
  
  console.log('✅ Clicked Connect button!');
  await sleep(2000 + Math.random() * 1000);
  
  console.log('📝 Handling connection modal...');
  
  const addNoteSelectors = [
    'button[aria-label*="Add a note"]',
    'button:has-text("Add a note")',
    'button[aria-label*="note"]'
  ];
  
  let noteAdded = false;
  
  for (const selector of addNoteSelectors) {
    try {
      const addNoteButton = await page.$(selector);
      if (addNoteButton) {
        const buttonPos = await addNoteButton.boundingBox();
        if (buttonPos) {
          await humanCursor.click(
            buttonPos.x + buttonPos.width / 2,
            buttonPos.y + buttonPos.height / 2
          );
          await sleep(1000 + Math.random() * 1000);
          noteAdded = true;
          break;
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  if (connectionNote && noteAdded) {
    console.log('✍️ Typing connection note...');
    
    const noteSelectors = [
      'textarea[name="message"]',
      'textarea[placeholder*="note"]',
      'textarea[aria-label*="message"]'
    ];
    
    let noteTextarea = null;
    
    for (const selector of noteSelectors) {
      noteTextarea = await page.$(selector);
      if (noteTextarea) break;
    }
    
    if (noteTextarea) {
      await noteTextarea.click();
      await sleep(500 + Math.random() * 500);
      await noteTextarea.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await sleep(300);
      await humanCursor.humanType(noteTextarea, connectionNote);
      await sleep(1000 + Math.random() * 1000);
    }
  }
  
  console.log('📤 Sending connection request...');
  
  const sendSelectors = [
    'button[aria-label*="Send"]',
    'button:has-text("Send")',
    'button[aria-label*="send invitation"]',
    'button.artdeco-button--primary:has-text("Send")'
  ];
  
  let requestSent = false;
  
  for (const selector of sendSelectors) {
    try {
      const sendButton = await page.$(selector);
      if (sendButton) {
        const buttonPos = await sendButton.boundingBox();
        if (buttonPos) {
          await humanCursor.click(
            buttonPos.x + buttonPos.width / 2,
            buttonPos.y + buttonPos.height / 2
          );
          requestSent = true;
          break;
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  if (!requestSent) {
    console.log('⚠️ Trying Enter key as fallback...');
    await page.keyboard.press('Enter');
    requestSent = true;
  }
  
  await sleep(3000 + Math.random() * 2000);
  
  const success = await page.evaluate(() => {
    const indicators = [
      'span:has-text("Pending")',
      'span:has-text("Invitation sent")',
      'button:has-text("Pending")',
      '[aria-label*="Pending"]',
      'div:has-text("invitation has been sent")'
    ];
    
    for (const selector of indicators) {
      if (document.querySelector(selector)) {
        return true;
      }
    }
    
    return false;
  });
  
  return success;
}

async function runLinkedInAutomation(
  automationId: string, 
  account: LinkedInAccountNew, 
  session: any,
  profileUrl: string, 
  connectionNote?: string
): Promise<void> {
  let browser: Browser | null = null;
  
  try {
    console.log(`\n🚀 Starting automation ${automationId}`);
    console.log(`👤 Account: ${account.name}`);
    console.log(`🎯 Target: ${profileUrl}`);
    
    // ============ DEBUG COOKIE INFO ============
    console.log('\n🔍 DEBUG COOKIE INFO:');
    console.log('='.repeat(50));
    console.log(`Direct li_at_cookie field: ${session.li_at_cookie?.substring(0, 50)}...`);
    console.log(`Direct li_at length: ${session.li_at_cookie?.length}`);
    console.log(`Direct li_at starts with AQED: ${session.li_at_cookie?.startsWith('AQED')}`);
    console.log('='.repeat(50));
    
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 800 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1280,800',
        `--user-data-dir=./user-data-${account.id}-${Date.now()}`, // Add timestamp
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage'
      ],
      executablePath: process.env.CHROME_PATH || 
                     'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    });
    
    activeBrowsers.set(automationId, {
      id: automationId,
      browser,
      startedAt: new Date(),
      accountId: account.id,
      status: 'running'
    });
    
    const page = await browser.newPage();
    
    // Use a realistic user-agent
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    await page.setUserAgent(userAgent);
    console.log(`🤖 User-Agent: ${userAgent.substring(0, 50)}...`);
    
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Upgrade-Insecure-Requests': '1',
    });
    
    // ============ SET COOKIES PROPERLY ============
    console.log('\n🍪 Setting LinkedIn cookies...');
    
    // Check if we have a valid li_at cookie
    let liAtValue = session.li_at_cookie;
    
    if (!liAtValue || liAtValue.length < 100) {
      throw new Error(`Invalid li_at cookie (length: ${liAtValue?.length || 0})`);
    }
    
    // DECODE Base64 if needed
    liAtValue = CookieDecryptor.decodeLiAtCookie(liAtValue);
    
    console.log(`✅ li_at cookie: ${liAtValue.substring(0, 30)}... (${liAtValue.length} chars)`);
    console.log(`✅ Starts with AQED: ${liAtValue.startsWith('AQED')}`);
    
    // Set ESSENTIAL LinkedIn cookies
    const essentialCookies = [
      // 1. li_at (MOST IMPORTANT)
      {
        name: 'li_at',
        value: liAtValue,
        domain: '.linkedin.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'None' as const
      },
      // 2. JSESSIONID (important for API calls)
      {
        name: 'JSESSIONID',
        value: session.jsessionid || `ajax:${Math.random().toString(36).substring(2)}`,
        domain: '.linkedin.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'None' as const
      },
      // 3. bcookie (browser cookie)
      {
        name: 'bcookie',
        value: `v=2&${Math.random().toString(36).substring(2)}`,
        domain: '.linkedin.com',
        path: '/',
        secure: true,
        sameSite: 'None' as const
      },
      // 4. lang (language)
      {
        name: 'lang',
        value: 'v=2&lang=en-us',
        domain: '.linkedin.com',
        path: '/'
      },
      // 5. lidc (LinkedIn data center cookie)
      {
        name: 'lidc',
        value: 'b=OB04:s=O:r=O:a=O:p=O:g=6035:u=841:x=1:i=1767579423:t=1767665806:v=2:sig=AQGlfU0ZJDUuWp0H0F1T2as_j7j2dn9k',
        domain: '.linkedin.com',
        path: '/',
        secure: true,
        sameSite: 'None' as const
      }
    ];
    
    await page.setCookie(...essentialCookies);
    console.log(`✅ Set ${essentialCookies.length} essential cookies`);
    
    // Wait a moment after setting cookies
    await sleep(2000);
    
    // ============ LOGIN TO LINKEDIN ============
    console.log('\n🔐 Logging into LinkedIn...');
    
    // Try going to feed page (more reliable than homepage)
    await page.goto('https://www.linkedin.com/feed', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    await sleep(3000);
    
    // Check if we're logged in
    const isLoggedIn = await page.evaluate(() => {
      const indicators = [
        document.querySelector('nav'),
        document.querySelector('.global-nav'),
        document.querySelector('input[placeholder*="Search"]'),
        document.querySelector('[data-test-global-nav-header]'),
        document.querySelector('button[data-control-name="nav.settings"]')
      ];
      return indicators.some(indicator => indicator !== null);
    });
    
    if (!isLoggedIn) {
      // Take screenshot for debugging
      await page.screenshot({ path: `debug-login-failed-${automationId}.png` });
      
      // Check what page we're on
      const pageTitle = await page.title();
      const currentUrl = await page.url();
      
      console.log(`❌ Login failed!`);
      console.log(`Page title: ${pageTitle}`);
      console.log(`Current URL: ${currentUrl}`);
      
      // Check for sign-in page elements
      const hasSignIn = await page.evaluate(() => {
        return document.querySelector('h1:contains("Sign in")') !== null ||
               document.querySelector('input[type="password"]') !== null ||
               document.querySelector('button[type="submit"]') !== null;
      });
      
      if (hasSignIn) {
        throw new Error('Cookies are invalid. LinkedIn is showing sign-in page.');
      }
      
      throw new Error('Login failed - not on LinkedIn feed page');
    }
    
    console.log('✅ Successfully logged in!');
    
    console.log(`🎯 Navigating to profile: ${profileUrl}`);
    await page.goto(profileUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await sleep(3000);
    
    const humanCursor = new HumanCursor(page);
    await simulateHumanBrowsing(page, humanCursor);
    
    const connectionSuccess = await handleConnectionRequest(page, humanCursor, connectionNote);
    
    if (connectionSuccess) {
      console.log('🎉 Connection sent successfully!');
      
      await updateAutomationLog({
        accountId: account.id,
        profileUrl,
        status: 'sent',
        errorMessage: null
      });
      
      const browserInstance = activeBrowsers.get(automationId);
      if (browserInstance) {
        browserInstance.status = 'completed';
      }
      
    } else {
      throw new Error('Failed to send connection');
    }
    
    await sleep(5000);
    
  } catch (error: any) {
    console.error(`❌ Automation ${automationId} failed:`, error.message);
    
    await updateAutomationLog({
      accountId: account.id,
      profileUrl,
      status: 'failed',
      errorMessage: error.message
    });
    
    const browserInstance = activeBrowsers.get(automationId);
    if (browserInstance) {
      browserInstance.status = 'error';
    }
    
  } finally {
    if (browser) {
      try {
        await browser.close();
        activeBrowsers.delete(automationId);
        console.log(`✅ Browser closed for ${automationId}`);
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
}

// ==================== API ENDPOINTS ====================

// Health check
app.get('/api/health', (req: Request, res: Response<HealthResponse>) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    activeBrowsers: activeBrowsers.size
  });
});

// Main automation endpoint
app.post('/api/automate', async (req: Request<{}, {}, AutomationRequest>, res: Response<AutomationResponse>) => {
  const { account_id, profile_url, connection_note } = req.body;
  const automationId = uuidv4();
  
  console.log(`\n🚀 Received automation request for account ${account_id}`);
  
  try {
    const { data: account, error: accountError } = await supabase
      .from('linkedin_accounts_new')
      .select('*')
      .eq('id', account_id)
      .single();

    if (accountError) throw new Error(`Account not found: ${accountError.message}`);
    
    const { data: session, error: sessionError } = await supabase
      .from('linkedin_sessions_new')
      .select('*')
      .eq('account_id', account_id)
      .eq('is_active', true)
      .single() as { data: LinkedInSessionEncrypted | null, error: any };
    
    if (sessionError || !session) {
      throw new Error(`Session not found: ${sessionError?.message || 'No session data'}`);
    }
    
    if (!session.cookies_encrypted && !session.li_at_cookie) {
      throw new Error('No cookies found for this account');
    }
    
    console.log('🔐 Processing cookies...');
    
    // ============ FIXED COOKIE EXTRACTION ============
    let liAtCookie = null;
    let jsessionId = null;
    
    // First, check if li_at_cookie field is valid
    if (session.li_at_cookie) {
      console.log(`🔍 Checking direct li_at_cookie field...`);
      liAtCookie = CookieDecryptor.decodeLiAtCookie(session.li_at_cookie);
      
      if (liAtCookie && liAtCookie.startsWith('AQED')) {
        console.log(`✅ Using decoded li_at_cookie field (${liAtCookie.length} chars)`);
      } else {
        console.log(`⚠️ Direct li_at_cookie field is invalid`);
        liAtCookie = null;
      }
    }
    
    // If direct field failed, try extracting from cookies_encrypted
    if (!liAtCookie && session.cookies_encrypted) {
      console.log(`🔄 Extracting from cookies_encrypted...`);
      const isValid = CookieDecryptor.validateCookies(session.cookies_encrypted);
      
      if (isValid) {
        liAtCookie = CookieDecryptor.extractLiAtCookie(session.cookies_encrypted);
        jsessionId = CookieDecryptor.extractJSessionId(session.cookies_encrypted);
        
        if (liAtCookie && liAtCookie.startsWith('AQED')) {
          console.log(`✅ Extracted li_at from encrypted data (${liAtCookie.length} chars)`);
        } else {
          console.log(`❌ Could not extract valid li_at from encrypted data`);
        }
      } else {
        console.log(`❌ cookies_encrypted data appears invalid`);
      }
    }
    
    if (!liAtCookie || !liAtCookie.startsWith('AQED')) {
      throw new Error('Could not extract valid li_at cookie from any source');
    }
    
    console.log(`✅ FINAL li_at cookie: ${liAtCookie.substring(0, 30)}...`);
    console.log(`✅ Starts with AQED: ${liAtCookie.startsWith('AQED')}`);
    console.log(`✅ Length: ${liAtCookie.length} chars`);
    
    const decryptedSession = {
      ...session,
      li_at_cookie: liAtCookie,
      jsessionid: jsessionId || undefined
    };
    
    setTimeout(async () => {
      await runLinkedInAutomation(automationId, account, decryptedSession, profile_url, connection_note);
    }, 1000);
    
    res.json({
      success: true,
      automationId,
      message: 'Automation started successfully. Watch the browser window.',
      account: account.name,
      target: profile_url
    });
    
  } catch (error: any) {
    console.error('❌ Automation setup error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      automationId
    });
  }
});

// Test cookies endpoint (NEW)
app.post('/api/test-cookies', async (req: Request, res: Response) => {
  try {
    const { account_id } = req.body;
    
    if (!account_id) {
      return res.status(400).json({
        success: false,
        error: 'account_id is required'
      });
    }
    
    console.log(`🔍 Testing cookies for account ${account_id}`);
    
    const { data: session, error } = await supabase
      .from('linkedin_sessions_new')
      .select('*')
      .eq('account_id', account_id)
      .eq('is_active', true)
      .single();
    
    if (error || !session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    // Test the cookie extraction
    const liAtCookie = CookieDecryptor.extractLiAtCookie(session.cookies_encrypted);
    const jsessionId = CookieDecryptor.extractJSessionId(session.cookies_encrypted);
    
    // Check if li_at_cookie field is Base64
    let directLiAt = session.li_at_cookie;
    let isBase64Encoded = false;
    
    if (directLiAt && !directLiAt.startsWith('AQED')) {
      try {
        const decoded = Buffer.from(directLiAt, 'base64').toString('utf-8');
        if (decoded.startsWith('AQED')) {
          directLiAt = decoded;
          isBase64Encoded = true;
        }
      } catch (e) {
        // Not Base64
      }
    }
    
    res.json({
      success: true,
      accountId: account_id,
      sessionFound: true,
      sessionId: session.id,
      
      // Direct li_at_cookie field
      directLiAtField: session.li_at_cookie ? `${session.li_at_cookie.substring(0, 30)}...` : null,
      directLiAtLength: session.li_at_cookie?.length || 0,
      isBase64Encoded: isBase64Encoded,
      decodedDirectLiAt: directLiAt ? `${directLiAt.substring(0, 30)}...` : null,
      decodedStartsWithAQED: directLiAt?.startsWith('AQED') || false,
      
      // Extracted from cookies_encrypted
      extractedLiAt: liAtCookie ? `${liAtCookie.substring(0, 30)}...` : null,
      extractedLiAtLength: liAtCookie?.length || 0,
      extractedStartsWithAQED: liAtCookie?.startsWith('AQED') || false,
      extractedJSessionId: jsessionId ? `${jsessionId.substring(0, 30)}...` : null,
      
      // Validation
      hasValidLiAt: (directLiAt && directLiAt.startsWith('AQED')) || (liAtCookie && liAtCookie.startsWith('AQED')),
      cookiesEncryptedLength: session.cookies_encrypted?.length || 0,
      cookiesEncryptedPreview: session.cookies_encrypted?.substring(0, 100) || null,
      isUrlEncoded: session.cookies_encrypted?.includes('%') || false
    });
    
  } catch (error: any) {
    console.error('Test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug cookies endpoint
app.post('/api/debug/cookies', async (req: Request, res: Response) => {
  try {
    const { account_id } = req.body;
    
    if (!account_id) {
      return res.status(400).json({
        success: false,
        error: 'account_id is required'
      });
    }
    
    const { data: session, error } = await supabase
      .from('linkedin_sessions_new')
      .select('*')
      .eq('account_id', account_id)
      .eq('is_active', true)
      .single();
    
    if (error || !session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    const liAtCookie = CookieDecryptor.extractLiAtCookie(session.cookies_encrypted);
    const jsessionId = CookieDecryptor.extractJSessionId(session.cookies_encrypted);
    
    res.json({
      success: true,
      accountId: account_id,
      hasCookies: !!session.cookies_encrypted,
      cookiesLength: session.cookies_encrypted?.length || 0,
      hasLiAt: !!liAtCookie,
      liAtLength: liAtCookie?.length || 0,
      liAtPreview: liAtCookie ? `${liAtCookie.substring(0, 20)}...` : null,
      hasJSessionId: !!jsessionId,
      jsessionIdPreview: jsessionId ? `${jsessionId.substring(0, 20)}...` : null,
      directLiAtField: session.li_at_cookie ? `${session.li_at_cookie.substring(0, 20)}...` : null,
      cookieCount: session.cookie_count,
      lastUsed: session.last_used
    });
    
  } catch (error: any) {
    console.error('Debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get active automations
app.get('/api/active', (req: Request, res: Response<ActiveResponse>) => {
  const activeAutomations = Array.from(activeBrowsers.entries()).map(([id, browserInstance]) => ({
    id,
    isConnected: browserInstance.browser?.isConnected?.() || false,
    status: browserInstance.status,
    uptime: Date.now() - browserInstance.startedAt.getTime(),
    accountId: browserInstance.accountId
  }));
  
  res.json({
    activeAutomations,
    count: activeBrowsers.size,
    timestamp: new Date().toISOString()
  });
});

// Stop all automations
app.post('/api/stop-all', async (req: Request, res: Response) => {
  try {
    console.log(`🛑 Stopping ${activeBrowsers.size} active browsers...`);
    
    const closePromises = [];
    const browserCount = activeBrowsers.size;
    
    for (const [id, browserInstance] of activeBrowsers) {
      closePromises.push(
        browserInstance.browser.close().then(() => {
          console.log(`✅ Stopped browser ${id}`);
        }).catch((error: any) => {
          console.error(`Error stopping browser ${id}:`, error.message);
        })
      );
    }
    
    await Promise.allSettled(closePromises);
    activeBrowsers.clear();
    
    res.json({
      success: true,
      message: `Stopped ${browserCount} automations`,
      stoppedCount: browserCount
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Batch automation endpoint
app.post('/api/automate/batch', async (req: Request, res: Response) => {
  const { account_id, profiles, connection_note } = req.body;
  
  if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Profiles array is required'
    });
  }
  
  const batchId = uuidv4();
  console.log(`\n🚀 Starting batch ${batchId} for ${profiles.length} profiles`);
  
  try {
    const { data: account, error: accountError } = await supabase
      .from('linkedin_accounts_new')
      .select('*')
      .eq('id', account_id)
      .single();

    if (accountError) throw new Error(`Account not found: ${accountError.message}`);
    
    const { data: session, error: sessionError } = await supabase
      .from('linkedin_sessions_new')
      .select('*')
      .eq('account_id', account_id)
      .eq('is_active', true)
      .single() as { data: LinkedInSessionEncrypted | null, error: any };
    
    if (sessionError || !session) {
      throw new Error(`Session not found: ${sessionError?.message || 'No session'}`);
    }
    
    // Use the FIXED extraction
    let liAtCookie = null;
    let jsessionId = null;
    
    // First try direct field
    if (session.li_at_cookie) {
      liAtCookie = CookieDecryptor.decodeLiAtCookie(session.li_at_cookie);
    }
    
    // If direct field failed, try extraction
    if (!liAtCookie || !liAtCookie.startsWith('AQED')) {
      liAtCookie = CookieDecryptor.extractLiAtCookie(session.cookies_encrypted);
      jsessionId = CookieDecryptor.extractJSessionId(session.cookies_encrypted);
    }
    
    if (!liAtCookie || !liAtCookie.startsWith('AQED')) {
      throw new Error('Could not extract valid li_at cookie');
    }
    
    const decryptedSession = {
      ...session,
      li_at_cookie: liAtCookie,
      jsessionid: jsessionId || undefined
    };
    
    setTimeout(async () => {
      await processBatch(batchId, account, decryptedSession, profiles, connection_note);
    }, 1000);
    
    res.json({
      success: true,
      batchId,
      message: `Batch started for ${profiles.length} profiles`,
      account: account.name
    });
    
  } catch (error: any) {
    console.error('❌ Batch error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      batchId
    });
  }
});

async function processBatch(
  batchId: string,
  account: LinkedInAccountNew,
  session: any,
  profiles: string[],
  connectionNote?: string
): Promise<void> {
  console.log(`\n🔄 Processing batch ${batchId}`);
  
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 0; i < profiles.length; i++) {
    const profileUrl = profiles[i];
    const profileNum = i + 1;
    
    console.log(`\n--- Profile ${profileNum}/${profiles.length} ---`);
    console.log(`🔗 ${profileUrl}`);
    
    try {
      if (i > 0) {
        const delay = 30000 + Math.random() * 15000;
        console.log(`⏳ Waiting ${Math.round(delay / 1000)} seconds...`);
        await sleep(delay);
      }
      
      await runLinkedInAutomation(
        `${batchId}-${profileNum}`,
        account,
        session,
        profileUrl,
        connectionNote
      );
      
      successCount++;
      console.log(`✅ Profile ${profileNum} successful`);
      
    } catch (error: any) {
      failureCount++;
      console.error(`❌ Profile ${profileNum} failed:`, error.message);
      
      if (error.message.includes('login') || error.message.includes('cookie')) {
        console.error('🚨 Critical error, stopping batch');
        break;
      }
    }
  }
  
  console.log(`\n📊 Batch ${batchId} completed:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failures: ${failureCount}`);
  console.log(`   📈 Rate: ${((successCount / profiles.length) * 100).toFixed(1)}%`);
}

// Start server
app.listen(PORT, () => {
  console.log(`
  🚀 LinkedIn Automation Server
  ==============================
  📍 Port: ${PORT}
  🌐 Health: http://localhost:${PORT}/api/health
  🤖 Single: POST http://localhost:${PORT}/api/automate
  📦 Batch: POST http://localhost:${PORT}/api/automate/batch
  🔍 Debug: POST http://localhost:${PORT}/api/debug/cookies
  🧪 Test: POST http://localhost:${PORT}/api/test-cookies
  ⏹️  Stop: POST http://localhost:${PORT}/api/stop-all
  📊 Active: GET http://localhost:${PORT}/api/active
  
  Server started: ${new Date().toISOString()}
  `);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  for (const [id, browserInstance] of activeBrowsers) {
    try {
      await browserInstance.browser.close();
      console.log(`✅ Closed ${id}`);
    } catch (error) {
      console.error(`Error closing ${id}:`, error);
    }
  }
  
  console.log('👋 Server shutdown complete.');
  process.exit(0);
});

// Export for testing
export { app, activeBrowsers, runLinkedInAutomation };