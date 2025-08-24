import { createClient } from '@supabase/supabase-js';

export async function testSupabaseConnectivity() {
  try {
    console.log('🔍 Testing Supabase connectivity...');
    
    // Check environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is not configured');
    }
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }

    console.log('🌍 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      nodeEnv: process.env.NODE_ENV || 'development',
      supabaseUrl: supabaseUrl
    });

    // Test basic HTTP connectivity first
    console.log('🌐 Testing basic HTTP connectivity...');
    try {
      const healthCheck = await fetch(`${supabaseUrl}/rest/v1/`);
      console.log('✅ Basic HTTP connectivity successful:', healthCheck.status);
    } catch (httpError) {
      console.error('❌ Basic HTTP connectivity failed:', httpError);
      throw new Error(`HTTP connectivity failed: ${httpError instanceof Error ? httpError.message : 'Unknown error'}`);
    }

    // Initialize Supabase client
    console.log('🔑 Initializing Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test simple query to user_profiles table
    console.log('📋 Testing user_profiles table access...');
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('count', { count: 'exact', head: true })
        .limit(1);
      
      if (error) {
        console.error('❌ user_profiles table access failed:', error);
        throw new Error(`Table access failed: ${error.message}`);
      }
      
      console.log('✅ user_profiles table access successful:', data);
    } catch (tableError) {
      console.error('❌ user_profiles table access error:', tableError);
      throw new Error(`Table access error: ${tableError instanceof Error ? tableError.message : 'Unknown error'}`);
    }

    // Test auth.users access
    console.log('🔐 Testing auth.users access...');
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('❌ auth.users access failed:', authError);
        throw new Error(`Auth access failed: ${authError.message}`);
      }
      
      console.log(`✅ auth.users access successful. Found ${authUsers.users.length} users`);
    } catch (authError) {
      console.error('❌ auth.users access error:', authError);
      throw new Error(`Auth access error: ${authError instanceof Error ? authError.message : 'Unknown error'}`);
    }

    return {
      success: true,
      message: 'All connectivity tests passed',
      details: {
        supabaseUrl: supabaseUrl,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('❌ Connectivity test failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      error: 'Connectivity test failed',
      details: errorMessage,
      timestamp: new Date().toISOString()
    };
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await testSupabaseConnectivity();
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Connectivity test endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Internal server error', details: errorMessage });
  }
}

