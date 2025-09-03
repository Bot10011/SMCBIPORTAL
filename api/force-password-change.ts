import { createClient } from '@supabase/supabase-js';

export async function handleForcePasswordChange(email: string, newPassword: string) {
  try {
    // Validate inputs
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

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

    // Prefer resolving auth user by profile.id (which should equal auth user id)
    let userId: string | null = null;
    try {
      const { data: userProfile, error: profileLookupError } = await supabase
        .from('user_profiles')
        .select('id, email')
        .ilike('email', email)
        .limit(1)
        .maybeSingle();
      if (!profileLookupError && userProfile?.id) {
        userId = userProfile.id;
      }
    } catch (profileLookupErr) {
      console.warn('Profile lookup by email failed; will fallback to auth listing:', profileLookupErr);
    }

    // Fallback: search auth users by email, with pagination to avoid missing users
    if (!userId) {
      let foundUserId: string | null = null;
      let page = 1;
      const perPage = 1000;
      for (let attempts = 0; attempts < 10; attempts++) { // cap pages to avoid runaway
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) {
          console.error('Auth user list error:', error);
          break;
        }
        const match = data.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
        if (match) {
          foundUserId = match.id;
          break;
        }
        if (data.users.length < perPage) break; // no more pages
        page += 1;
      }
      userId = foundUserId;
    }

    if (!userId) {
      console.error('No matching auth user found for email:', email);
      throw new Error('User not found in authentication system');
    }
    
    console.log('Resolved auth user id for password change:', userId, email);
    
    // Update the user's password using Supabase Auth Admin API
    const { error: passwordUpdateError } = await supabase.auth.admin.updateUserById(
      userId,
      { 
        password: newPassword,
        email_confirm: true // This will confirm the email if it wasn't already
      }
    );
    
    if (passwordUpdateError) {
      console.error('Password update error:', passwordUpdateError);
      throw new Error(`Failed to update password: ${passwordUpdateError.message}`);
    }

    // Also try to update user profile if it exists
    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email')
        .ilike('email', email)
        .limit(1)
        .maybeSingle();

      if (userProfile && !profileError) {
        // Update the profile to mark that user has changed their password
        await supabase
          .from('user_profiles')
          .update({ 
            updated_at: new Date().toISOString(),
            // You could add a field like 'password_changed_at' if you want to track this
          })
          .eq('id', userProfile.id);
      }
    } catch (profileError) {
      console.warn('Failed to update user profile:', profileError);
      // Don't fail the password change for this
    }
    
    // Return success result
    return { 
      success: true, 
      message: 'Password changed successfully',
      data: {
        user: {
          id: userId,
          email
        },
        changedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Force password change error:', error);
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    const result = await handleForcePasswordChange(email, newPassword);
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

