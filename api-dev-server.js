import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config({ path: '.env' });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes - directly call the functions
app.post('/api/send-password-reset-email', async (req, res) => {
  try {
    console.log('Received password reset request:', req.body);
    
    // Import and call the function directly
    const { handlePasswordReset } = await import('./api/send-password-reset-email.ts');
    const result = await handlePasswordReset(req.body.email);
    
    console.log('Password reset result:', result);
    res.json(result);
  } catch (error) {
    console.error('Error in send-password-reset-email:', error);
    res.status(500).json({ 
      error: 'Failed to process request', 
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/verify-reset-code', async (req, res) => {
  try {
    console.log('Received verification code request:', req.body);
    
    // Import and call the function directly
    const { handleCodeVerification } = await import('./api/verify-reset-code.ts');
    const result = await handleCodeVerification(req.body.email, req.body.code);
    
    console.log('Code verification result:', result);
    res.json(result);
  } catch (error) {
    console.error('Error in verify-reset-code:', error);
    res.status(500).json({ 
      error: 'Failed to process request', 
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    console.log('Received password reset request:', req.body);
    
    // Import and call the function directly
    const { handlePasswordReset } = await import('./api/reset-password.ts');
    const result = await handlePasswordReset(req.body.email, req.body.newPassword);
    
    console.log('Password reset result:', result);
    res.json(result);
  } catch (error) {
    console.error('Error in reset-password:', error);
    res.status(500).json({ 
      error: 'Failed to process request', 
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/force-password-change', async (req, res) => {
  try {
    console.log('Received force password change request:', req.body);
    
    // Import and call the function directly
    const { handleForcePasswordChange } = await import('./api/force-password-change.ts');
    const result = await handleForcePasswordChange(req.body.email, req.body.newPassword);
    
    console.log('Force password change result:', result);
    res.json(result);
  } catch (error) {
    console.error('Error in force-password-change:', error);
    res.status(500).json({ 
      error: 'Failed to process request', 
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/env-check', async (req, res) => {
  try {
    console.log('Received environment check request');
    
    // Import and call the function directly
    const main = await import('./api/env-check.ts');
    const result = await main.default();
    
    console.log('Environment check result:', result);
    res.json(result);
  } catch (error) {
    console.error('Error in env-check:', error);
    res.status(500).json({ 
      error: 'Failed to process request', 
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: {
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  });
});

// Email usage monitoring endpoint
app.get('/api/email-usage', async (req, res) => {
  try {
    console.log('Received email usage request');
    
    // Import and call the function directly
    const { getEmailUsage } = await import('./api/get-email-usage.ts');
    const result = await getEmailUsage();
    
    console.log('Email usage result:', result);
    res.json(result);
  } catch (error) {
    console.error('Error in email-usage:', error);
    res.status(500).json({ 
      error: 'Failed to process request', 
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Security events endpoint
app.post('/api/security-events', async (req, res) => {
  try {
    console.log('🚨 Security event received:', req.body);
    
    // Import and call the function directly
    const handler = await import('./api/security-events.ts');
    await handler.default(req, res);
  } catch (error) {
    console.error('Error in security-events:', error);
    res.status(500).json({ 
      error: 'Failed to process request', 
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/security-events', async (req, res) => {
  try {
    console.log('📊 Security events query received');
    
    // Import and call the function directly
    const handler = await import('./api/security-events.ts');
    await handler.default(req, res);
  } catch (error) {
    console.error('Error in security-events GET:', error);
    res.status(500).json({ 
      error: 'Failed to process request', 
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Rate limiting endpoint
app.post('/api/rate-limit', async (req, res) => {
  try {
    console.log('⏱️ Rate limit check received:', req.body);
    
    // Import and call the function directly
    const handler = await import('./api/rate-limit.ts');
    await handler.default(req, res);
  } catch (error) {
    console.error('Error in rate-limit:', error);
    res.status(500).json({ 
      error: 'Failed to process request', 
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Test attack endpoint
app.post('/api/test-attack', async (req, res) => {
  try {
    console.log('🧪 Test attack received:', req.body);
    
    // Import and call the function directly
    const handler = await import('./api/test-attack.ts');
    await handler.default(req, res);
  } catch (error) {
    console.error('Error in test-attack:', error);
    res.status(500).json({ 
      error: 'Failed to process request', 
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Get auth users endpoint
app.get('/api/get-auth-users', async (req, res) => {
  try {
    console.log('👥 Get auth users request received');
    
    // Import and call the function directly
    const handler = await import('./api/get-auth-users.ts');
    await handler.default(req, res);
  } catch (error) {
    console.error('Error in get-auth-users:', error);
    res.status(500).json({ 
      error: 'Failed to process request', 
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Update auth email endpoint
app.post('/api/update-auth-email', async (req, res) => {
  try {
    console.log('📧 Update auth email request received:', req.body);
    
    // Import and call the function directly
    const handler = await import('./api/update-auth-email.ts');
    await handler.default(req, res);
  } catch (error) {
    console.error('Error in update-auth-email:', error);
    res.status(500).json({ 
      error: 'Failed to process request', 
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Catch-all for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Start server
const PORT = process.env.API_PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Development API Server running on port ${PORT}`);
  console.log(`📧 Password reset endpoint: http://localhost:${PORT}/api/send-password-reset-email`);
  console.log(`✅ Verification endpoint: http://localhost:${PORT}/api/verify-reset-code`);
  console.log(`🔑 Password reset endpoint: http://localhost:${PORT}/api/reset-password`);
  console.log(`🔍 Environment check endpoint: http://localhost:${PORT}/api/env-check`);
  console.log(`💚 Health check endpoint: http://localhost:${PORT}/api/health`);
  console.log(`🚨 Security events endpoint: http://localhost:${PORT}/api/security-events`);
  console.log(`⏱️ Rate limit endpoint: http://localhost:${PORT}/api/rate-limit`);
  console.log(`🧪 Test attack endpoint: http://localhost:${PORT}/api/test-attack`);
  console.log(`👥 Get auth users endpoint: http://localhost:${PORT}/api/get-auth-users`);
  console.log(`📧 Update auth email endpoint: http://localhost:${PORT}/api/update-auth-email`);
  console.log('');
  console.log('Make sure to set these environment variables:');
  console.log('- RESEND_API_KEY');
  console.log('- SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  console.log('- PUBLIC_SITE_URL (optional, defaults to http://localhost:5173)');
});

export default app;
