import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, newEmail } = req.body;
    if (!userId || !newEmail) {
      return res.status(400).json({ error: 'Missing userId or newEmail' });
    }

    // 1. Update email in Supabase Auth (Admin API)
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, { email: newEmail });
    if (authError) {
      console.error('Supabase Auth error:', authError);
      return res.status(400).json({ error: `Auth update failed: ${authError.message}` });
    }

    // 2. Update email in your custom users table
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({ email: newEmail })
      .eq('id', userId);

    if (dbError) {
      console.error('Database update error:', dbError);
      return res.status(500).json({ error: `DB update failed: ${dbError.message}` });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    // Catch any unexpected errors
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err instanceof Error ? err.message : err });
  }
} 