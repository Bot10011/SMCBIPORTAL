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

    // Find the user in auth.users table
    const { data: authUsers, error: authUserError } = await supabase.auth.admin.listUsers();
    
    if (authUserError) {
      console.error('Auth user error:', authUserError);
      throw new Error('Failed to access user authentication data');
    }
    
    // Find a matching user case-insensitively
    const user = authUsers.users.find(
      u => u.email && u.email.toLowerCase() === email.toLowerCase()
    );
    
    if (!user) {
      console.error('No matching auth user found for email:', email);
      throw new Error('User not found in authentication system');
    }
    
    console.log('Found user in auth system:', user.id, user.email);
    
    // Update the user's password using Supabase Auth Admin API
    const { error: passwordUpdateError } = await supabase.auth.admin.updateUserById(
      user.id,
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
          id: user.id,
          email: user.email
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
