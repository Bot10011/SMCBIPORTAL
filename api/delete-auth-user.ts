import { createClient } from '@supabase/supabase-js';

type Req = { method: string; body?: unknown };
type Res = { status: (code: number) => { json: (data: unknown) => void } };

export default async function handler(req: Req, res: Res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId } = (req.body || {}) as { userId?: string };
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      // If the user does not exist in Auth, report a 404-like error
      return res.status(400).json({ error: error.message || 'Failed to delete auth user' });
    }

    return res.status(200).json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
}


