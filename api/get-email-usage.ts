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
        totalEmailsSent: totalCount,
        emailsLastDay: recentCount,
        emailsLast30Days: monthlyCount,
        quotaLimit: 3000,
        quotaRemaining: 3000 - monthlyCount,
        quotaUsagePercent: ((monthlyCount / 3000) * 100).toFixed(2)
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

// For direct execution (testing)
if (process.argv[1] === import.meta.url) {
  getEmailUsage()
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}
