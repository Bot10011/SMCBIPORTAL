import { createClient } from '@supabase/supabase-js';

export async function getEmailUsage() {
  try {
    // Check environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is not configured');
    }
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get total count of emails sent
    const { count: totalCount, error: totalError } = await supabase
      .from('verification_codes')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      throw new Error(`Failed to get total email count: ${totalError.message}`);
    }

    // Get count of emails sent in the last 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const { count: recentCount, error: recentError } = await supabase
      .from('verification_codes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twentyFourHoursAgo.toISOString());
    
    if (recentError) {
      throw new Error(`Failed to get recent email count: ${recentError.message}`);
    }

    // Get count of emails sent in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: monthlyCount, error: monthlyError } = await supabase
      .from('verification_codes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());
    
    if (monthlyError) {
      throw new Error(`Failed to get monthly email count: ${monthlyError.message}`);
    }

    return {
      success: true,
      data: {
        totalEmailsSent: totalCount || 0,
        emailsLastDay: recentCount || 0,
        emailsLast30Days: monthlyCount || 0,
        quotaLimit: 3000,
        quotaRemaining: 3000 - (monthlyCount || 0),
        quotaUsagePercent: (((monthlyCount || 0) / 3000) * 100).toFixed(2)
      }
    };

  } catch (error) {
    console.error('Error getting email usage:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// Vercel API handler
export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await getEmailUsage();
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
