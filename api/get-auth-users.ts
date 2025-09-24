import { createClient, type User as SupabaseUser } from '@supabase/supabase-js';
import type { Request, Response } from 'express';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export default async function handler(req: Request, res: Response) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get ALL auth users with admin privileges (handle pagination)
    const perPage = 1000; // Supabase max per page
    let page = 1;
    const allAuthUsers: SupabaseUser[] = [];

    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error('Auth users error:', error);
        return res.status(400).json({ error: `Failed to fetch auth users: ${error.message}` });
      }

      allAuthUsers.push(...(data?.users || []));

      if (!data || (data.users || []).length < perPage) {
        break;
      }
      page += 1;
    }

    // Get user profiles to check which users are students
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, role, department, year_level, section, is_active');

    if (profileError) {
      console.error('Profile error:', profileError);
      return res.status(400).json({ error: `Failed to fetch profiles: ${profileError.message}` });
    }

    // Create a map of student IDs from user_profiles
    const studentIds = new Set(
      profiles?.filter(p => p.role === 'student').map(p => p.id) || []
    );
    
    // Filter auth users to only include students and combine with profile data
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    const combinedUsers = allAuthUsers
      .filter(authUser => studentIds.has(authUser.id))
      .map(authUser => {
        const profile = profileMap.get(authUser.id)!;
        return {
          id: authUser.id,
          email: authUser.email || '',
          display_name: authUser.user_metadata?.display_name || authUser.user_metadata?.full_name || '',
          first_name: authUser.user_metadata?.first_name || '',
          last_name: authUser.user_metadata?.last_name || '',
          avatar_url: authUser.user_metadata?.avatar_url || '',
          role: profile.role,
          department: profile.department,
          year_level: profile.year_level,
          section: profile.section,
          is_active: profile.is_active,
          created_at: authUser.created_at
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return res.status(200).json({ users: combinedUsers });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err instanceof Error ? err.message : err });
  }
}

