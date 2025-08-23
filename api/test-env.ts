// Test environment variables endpoint
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const envCheck = {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasPublicSiteUrl: !!process.env.PUBLIC_SITE_URL,
      supabaseUrl: process.env.SUPABASE_URL ? 'Set' : 'Missing',
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
      resendKey: process.env.RESEND_API_KEY ? 'Set' : 'Missing',
      publicSiteUrl: process.env.PUBLIC_SITE_URL ? 'Set' : 'Missing'
    };

    console.log('Environment variables check:', envCheck);

    return res.status(200).json({
      message: 'Environment check completed',
      environment: envCheck,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test env error:', error);
    return res.status(500).json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

