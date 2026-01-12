const express = require('express');
const cors = require('cors');
const { LinkedInConnector } = require('./puppeteer-connector');

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('✅ Health check received');
  res.json({ 
    status: 'ok', 
    message: 'Automation server is running',
    timestamp: new Date().toISOString()
  });
});

// Main automation endpoint
app.post('/api/automate', async (req, res) => {
  console.log('📥 Received automation request');
  
  try {
    const { 
      account, 
      session, 
      profile_url, 
      connection_note 
    } = req.body;

    console.log('📋 Task details:', {
      account: account?.name,
      profile_url,
      has_note: !!connection_note,
      cookie_length: session?.li_at_cookie?.length || 0
    });

    // Validate required fields
    if (!session?.li_at_cookie) {
      return res.status(400).json({
        success: false,
        error: 'No li_at cookie provided'
      });
    }

    if (!profile_url || !profile_url.includes('linkedin.com')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid LinkedIn profile URL'
      });
    }

    // Create connector instance
    const connector = new LinkedInConnector();
    
    console.log('🤖 Starting LinkedIn automation...');
    
    // Send connection request
    const result = await connector.sendConnection({
      profile_url,
      connection_note: connection_note || 'Hi, I would like to connect with you.',
      session: {
        li_at_cookie: session.li_at_cookie,
        browser_agent: session.browser_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log('📊 Automation result:', {
      success: result.success,
      status: result.status,
      message: result.message
    });

    // Close browser
    await connector.close();

    // Send response
    res.json(result);

  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Internal server error'
    });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Express server running on http://localhost:${PORT}`);
  console.log(`📡 Endpoints:`);
  console.log(`   • Health: http://localhost:${PORT}/api/health`);
  console.log(`   • Automate: http://localhost:${PORT}/api/automate`);
});