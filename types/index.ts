// src/types/index.ts - Add these interfaces

export interface LinkedInSessionEncrypted {
  id: number;
  account_id: number;
  li_at_cookie: string; // This is now the ENCRYPTED cookie
  cookies_encrypted: string; // JSON string of all encrypted cookies
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

// Cookie interface
export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: string;
  expirationDate?: number;
  session?: boolean;
  storeId?: string;
}