import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: 'userIds array is required' });
    }

    console.log('Requested user IDs:', userIds);

    // Check environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return res.status(500).json({ error: 'Server is missing Supabase credentials.' });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch user metadata from Supabase Auth
    console.log('Attempting to fetch users from Supabase Auth...');
    const { data: users, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch user data', details: error.message });
    }

    console.log(`Successfully fetched ${users.users?.length || 0} users from Supabase Auth`);

    // Filter users by the requested IDs and extract metadata
    const userMetadata = users.users
      .filter(user => userIds.includes(user.id))
      .map(user => ({
        id: user.id,
        displayName: user.user_metadata?.full_name || 
                    user.user_metadata?.name || 
                    user.user_metadata?.display_name ||
                    `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'Unknown',
        avatar: user.user_metadata?.avatar_url || 
                user.user_metadata?.picture || 
                user.user_metadata?.photoURL || null,
        provider: user.app_metadata?.provider || 'email',
        email: user.email
      }));

    return res.status(200).json({ users: userMetadata });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}















