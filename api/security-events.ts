import { createClient } from '@supabase/supabase-js';

interface Request {
  method: string;
  body?: { type?: string; ip?: string; details?: string };
}

interface Response {
  status: (code: number) => Response;
  json: (data: unknown) => void;
}

export default async function handler(req: Request, res: Response) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ success: false, message: 'Server env not configured' });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const ensureTable = async () => {
    // Best-effort existence check; do not attempt migrations here
    const { error } = await admin.from('security_events').select('id').limit(1);
    return !error;
  };

  try {
    const hasTable = await ensureTable();

    if (req.method === 'GET') {
      if (!hasTable) {
        return res.status(200).json({ success: true, fallback: true, events: [] });
      }

      const { data, error } = await admin
        .from('security_events')
        .select('id, type, ip, details, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return res.status(200).json({ success: true, fallback: true, events: [] });
      }

      return res.status(200).json({ success: true, fallback: false, events: data });
    }

    if (req.method === 'POST') {
      const { type, ip, details } = req.body || {};
      if (!type || !ip) {
        return res.status(400).json({ success: false, message: 'Missing type or ip' });
      }

      if (!hasTable) {
        return res.status(200).json({ success: true, fallback: true });
      }

      const { error } = await admin
        .from('security_events')
        .insert({ type, ip, details });

      if (error) {
        return res.status(200).json({ success: true, fallback: true });
      }

      return res.status(201).json({ success: true, fallback: false });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (e: unknown) {
    const error = e as Error;
    return res.status(500).json({ success: false, message: error?.message || 'Unknown error' });
  }
}


