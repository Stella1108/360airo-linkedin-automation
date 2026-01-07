export const EXTENSION_ID = '360airo-linkedin-extension' // Just a name, not actual ID

// Check if extension is installed - UPDATED VERSION
export function checkExtensionInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    // Method 1: Check global variable set by auto-detection
    if ((window as any).__360AIRO_EXTENSION_DETECTED) {
      console.log('✅ Extension found via auto-detection');
      resolve(true);
      return;
    }

    // Method 2: Use message passing (auto-detection method)
    const checkId = Date.now().toString();
    
    const listener = (event: MessageEvent) => {
      if (event.data && event.data.type === '360AIRO_EXTENSION_RESPONSE') {
        window.removeEventListener('message', listener);
        // Store in global for future checks
        (window as any).__360AIRO_EXTENSION_DETECTED = event.data.data;
        resolve(true);
      }
    };

    window.addEventListener('message', listener);
    
    // Send check message - CORRECT SYNTAX
    window.postMessage({ 
      type: '360AIRO_EXTENSION_CHECK',
      checkId: checkId,
      timestamp: Date.now()
    }, '*'); // <- SECOND PARAMETER IS TARGET ORIGIN

    // Timeout after 1 second
    setTimeout(() => {
      window.removeEventListener('message', listener);
      resolve(false);
    }, 1000);
  });
}

// Download extension helper
export function downloadExtension(): void {
  const link = document.createElement('a');
  link.href = '/extensions/360airo-Linkedin-Chrome-Extension.zip';
  link.download = '360airo-Linkedin-Chrome-Extension.zip';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate extension token
export function generateExtensionToken(userId: string): string {
  return `ext_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}