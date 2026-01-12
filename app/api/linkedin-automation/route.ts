// app/api/linkedin-automation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { LinkedInConnector } from '@/lib/puppeteer-connector';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('🚀 LinkedIn Automation API called');
  
  try {
    const body = await request.json();
    
    // Validate inputs
    if (!body.profile_url || !body.session?.li_at_cookie) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          message: 'Profile URL and LinkedIn cookie are required'
        },
        { status: 400 }
      );
    }

    // Clean and validate inputs
    const profileUrl = body.profile_url.trim();
    const liAtCookie = body.session.li_at_cookie.trim();
    const actionType = body.action_type || 'both';
    const headless = body.headless !== undefined ? body.headless : true;
    const stealthMode = body.stealth_mode !== undefined ? body.stealth_mode : true;

    // Log the request (without full cookie)
    console.log('📦 Processing automation request:', {
      profileUrl,
      cookieLength: liAtCookie.length,
      actionType,
      headless
    });

    // Use the LinkedInConnector
    const connector = new LinkedInConnector();
    
    try {
      const task = {
        profile_url: profileUrl,
        session: {
          li_at_cookie: liAtCookie,
          browser_agent: body.session.browser_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        headless: headless,
        stealth_mode: stealthMode
      };

      console.log('🎯 Starting automation with task:', {
        profile: task.profile_url,
        headless: task.headless
      });

      let result;
      
      if (actionType === 'connect') {
        result = await connector.sendConnection(task);
      } else if (actionType === 'follow') {
        // For follow-only, we'll still use sendConnectionOrFollow but modify behavior
        const fullResult = await connector.sendConnectionOrFollow(task);
        
        // If it did connect instead of follow, mark as failed for follow-only
        if (fullResult.action === 'connect') {
          result = {
            ...fullResult,
            success: false,
            message: '❌ Found Connect button instead of Follow button',
            action: 'none'
          };
        } else if (fullResult.action === 'both') {
          result = {
            ...fullResult,
            message: fullResult.message?.replace('Connection request sent!', '') + ' (Followed only)',
            action: 'follow'
          };
        } else {
          result = fullResult;
        }
      } else {
        result = await connector.sendConnectionOrFollow(task);
      }

      console.log('✅ Automation completed:', {
        success: result.success,
        action: result.action,
        message: result.message
      });
      
      // Return the result
      return NextResponse.json({
        ...result,
        timestamp: new Date().toISOString(),
        processed_at: new Date().toISOString()
      });

    } finally {
      // Always close the browser
      await connector.close();
    }

  } catch (error: any) {
    console.error('❌ API route error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        message: 'Automation failed',
        action: 'none',
        status: 'failed'
      },
      { status: 500 }
    );
  }
}

// Test cookie endpoint
export async function POSTTestCookie(request: NextRequest) {
  try {
    const body = await request.json();
    const liAtCookie = body.li_at_cookie?.trim();
    
    if (!liAtCookie) {
      return NextResponse.json(
        { valid: false, error: 'Cookie is required' },
        { status: 400 }
      );
    }
    
    // Simple validation - check if cookie looks valid
    const isValid = liAtCookie.length > 100 && !liAtCookie.includes(' ');
    
    return NextResponse.json({
      valid: isValid,
      length: liAtCookie.length,
      message: isValid ? 'Cookie appears valid' : 'Cookie may be invalid'
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, error: error.message },
      { status: 500 }
    );
  }
}