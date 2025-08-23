// Environment check endpoint for debugging
async function main() {
  try {
    const envCheck = {
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasPublicSiteUrl: !!process.env.PUBLIC_SITE_URL,
      resendKeyLength: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.length : 0,
      supabaseUrlLength: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.length : 0,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.length : 0,
      publicSiteUrl: process.env.PUBLIC_SITE_URL || 'Not set',
      nodeEnv: process.env.NODE_ENV || 'Not set',
      timestamp: new Date().toISOString()
    };

    // Return result for the dev server
    return {
      success: true,
      message: 'Environment variables check',
      data: envCheck
    };

  } catch (error) {
    console.error('Environment check error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Check if this file is being run directly (for testing)
if (process.argv[1] === import.meta.url) {
  // Actually call the function and output the result
  main()
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}

// Export for use as module
export default main;

