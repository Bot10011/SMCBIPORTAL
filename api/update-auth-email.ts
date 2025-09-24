import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) { 
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, newEmail } = req.body;
    if (!userId || !newEmail) {
      return res.status(400).json({ error: 'Missing userId or newEmail' });
    }

    // Update email in auth.users table using admin API
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: newEmail
    });

    if (authError) {
      console.error('Auth update error:', authError);
      return res.status(400).json({ error: `Failed to update email in auth: ${authError.message}` });
    }

    // Also update email in user_profiles table for consistency
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({ email: newEmail })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
      // Don't fail the request, just log the error since auth update succeeded
      console.warn('Auth email updated but profile email update failed');
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err instanceof Error ? err.message : err });
  }
}

