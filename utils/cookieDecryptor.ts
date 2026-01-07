// src/utils/cookieDecryptor.ts

/**
 * CookieDecryptor - Extracts cookies from stored data
 * NOTE: This doesn't actually "decrypt" - it extracts from JSON/Base64
 */
export class CookieDecryptor {
  
  // ============ DEBUG/TRACE METHODS ============
  
  static traceInput(input: string, methodName: string): void {
    console.log(`\n🔍 [CookieDecryptor.${methodName}] INPUT TRACE:`);
    console.log('='.repeat(70));
    console.log(`Input length: ${input?.length || 0} characters`);
    console.log(`First 200 chars: ${input?.substring(0, 200)}...`);
    
    // Check what type of data we have
    if (!input) {
      console.log('❌ Input is null/empty');
    } else if (this.isValidJson(input)) {
      console.log('✅ Input appears to be valid JSON');
    } else if (this.isBase64(input)) {
      console.log('✅ Input appears to be Base64 encoded');
      const decoded = Buffer.from(input, 'base64').toString('utf-8');
      console.log(`Base64 decoded length: ${decoded.length} chars`);
      console.log(`Decoded preview: ${decoded.substring(0, 200)}...`);
    } else if (input.includes('li_at')) {
      console.log('✅ Input contains "li_at" text');
    } else if (input.startsWith('AQED')) {
      console.log('✅ Input is a direct li_at cookie');
    } else {
      console.log('⚠️ Input format unknown');
    }
    console.log('='.repeat(70));
  }
  
  private static isValidJson(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }
  
  private static isBase64(str: string): boolean {
    try {
      return Buffer.from(str, 'base64').toString('base64') === str;
    } catch {
      return false;
    }
  }
  
  // ============ MAIN EXTRACTION METHODS ============
  
  /**
   * Parse cookies from stored data
   */
  static parseCookies(cookiesEncrypted: string): any[] {
    this.traceInput(cookiesEncrypted, 'parseCookies');
    
    try {
      // Try multiple decoding strategies
      let dataToParse = cookiesEncrypted;
      
      // Strategy 1: Try Base64 decode first
      if (this.isBase64(cookiesEncrypted)) {
        try {
          const decoded = Buffer.from(cookiesEncrypted, 'base64').toString('utf-8');
          if (this.isValidJson(decoded)) {
            console.log('✅ Successfully decoded Base64 to JSON');
            dataToParse = decoded;
          }
        } catch (e) {
          console.log('⚠️ Base64 decode failed, trying as-is');
        }
      }
      
      // Strategy 2: Parse as JSON
      const cookies = JSON.parse(dataToParse);
      
      if (Array.isArray(cookies)) {
        console.log(`✅ Parsed ${cookies.length} cookies from JSON array`);
        return cookies;
      }
      
      console.log('✅ Parsed single cookie object');
      return [cookies];
      
    } catch (error: any) {
      console.error('❌ JSON parsing failed:', error.message);
      
      // Strategy 3: Direct li_at extraction
      console.log('🔄 Trying direct li_at extraction...');
      const liAtMatch = cookiesEncrypted.match(/(AQED[^"'\s]{100,})/);
      if (liAtMatch) {
        console.log('✅ Found li_at cookie via regex');
        return [{
          name: 'li_at',
          value: liAtMatch[1],
          domain: '.linkedin.com',
          path: '/',
          secure: true,
          httpOnly: true,
          sameSite: 'None'
        }];
      }
      
      console.log('❌ Could not extract any cookies');
      return [];
    }
  }
  
  /**
   * Extract li_at cookie from stored data
   */
  static extractLiAtCookie(cookiesEncrypted: string): string | null {
    console.log(`\n🎯 [CookieDecryptor.extractLiAtCookie] STARTING EXTRACTION`);
    
    try {
      const cookies = this.parseCookies(cookiesEncrypted);
      
      // Find li_at cookie
      const liAtCookie = cookies.find((cookie: any) => 
        cookie.name === 'li_at' || 
        cookie.name?.toLowerCase().includes('li_at')
      );
      
      if (liAtCookie && liAtCookie.value) {
        console.log(`✅ SUCCESS: Extracted li_at cookie (${liAtCookie.value.length} chars)`);
        console.log(`Preview: ${liAtCookie.value.substring(0, 30)}...`);
        console.log(`Starts with AQED: ${liAtCookie.value.startsWith('AQED')}`);
        return liAtCookie.value;
      }
      
      console.log('❌ li_at cookie not found in parsed data');
      
      // Fallback: Direct search
      console.log('🔄 Trying direct search fallback...');
      const liAtRegex = /li_at.*?["']([^"']{20,})["']/i;
      const match = cookiesEncrypted.match(liAtRegex);
      
      if (match && match[1]) {
        const value = match[1].replace(/"/g, '').replace(/'/g, '').trim();
        console.log(`✅ Fallback success: Found li_at (${value.length} chars)`);
        return value;
      }
      
      console.log('❌ Could not extract li_at cookie by any method');
      return null;
      
    } catch (error: any) {
      console.error('❌ Extraction error:', error.message);
      return null;
    }
  }
  
  /**
   * Extract JSESSIONID from stored data
   */
  static extractJSessionId(cookiesEncrypted: string): string | null {
    try {
      const cookies = this.parseCookies(cookiesEncrypted);
      
      const jsessionCookie = cookies.find((cookie: any) => 
        cookie.name === 'JSESSIONID' || 
        cookie.name?.toLowerCase().includes('jsession')
      );
      
      if (jsessionCookie && jsessionCookie.value) {
        const value = jsessionCookie.value.replace(/"/g, '');
        console.log(`✅ Extracted JSESSIONID (${value.length} chars)`);
        return value;
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting JSESSIONID:', error);
      return null;
    }
  }
  
  /**
   * Get all LinkedIn cookies for Puppeteer
   */
  static getAllCookiesForPuppeteer(cookiesEncrypted: string): any[] {
    try {
      const cookies = this.parseCookies(cookiesEncrypted);
      
      return cookies.map((cookie: any) => ({
        name: cookie.name || '',
        value: cookie.value || '',
        domain: cookie.domain || '.linkedin.com',
        path: cookie.path || '/',
        secure: cookie.secure !== false,
        httpOnly: cookie.httpOnly !== false,
        sameSite: cookie.sameSite || 'None',
        ...(cookie.expirationDate && { expires: cookie.expirationDate })
      }));
    } catch (error) {
      console.error('Error getting cookies for Puppeteer:', error);
      return [];
    }
  }
  
  /**
   * Validate cookies data
   */
  static validateCookies(cookiesEncrypted: string): boolean {
    if (!cookiesEncrypted || cookiesEncrypted.trim().length === 0) {
      return false;
    }
    
    const hasLiAt = cookiesEncrypted.toLowerCase().includes('li_at');
    const looksLikeCookies = cookiesEncrypted.includes('"name"') || 
                             cookiesEncrypted.includes('"value"') ||
                             cookiesEncrypted.includes('"domain"');
    const hasAqed = cookiesEncrypted.includes('AQED');
    
    console.log(`🔍 Cookie validation:`);
    console.log(`  Has "li_at": ${hasLiAt}`);
    console.log(`  Looks like cookies JSON: ${looksLikeCookies}`);
    console.log(`  Has "AQED": ${hasAqed}`);
    
    return hasLiAt || looksLikeCookies || hasAqed;
  }
}