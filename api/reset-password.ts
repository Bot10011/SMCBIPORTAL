import { createClient } from '@supabase/supabase-js';

export async function handlePasswordReset(email: string, newPassword: string) {
  try {
    // Validate inputs
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
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

    // Find the verified verification code
    const { data: verificationData, error: verificationError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('purpose', 'password_reset')
      .eq('status', 'verified')
      .order('verified_at', { ascending: false })
      .limit(1)
      .single();

    if (verificationError || !verificationData) {
      throw new Error('No verified verification code found. Please verify your code first.');
    }

    // Check if verification code was verified recently (within last 30 minutes)
    const verificationTime = new Date(verificationData.verified_at);
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    if (verificationTime < thirtyMinutesAgo) {
      throw new Error('Verification code has expired. Please request a new one.');
    }

    // Get user profile
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email, auth_user_id')
      .ilike('email', email) // Case-insensitive email match
      .limit(1)
      .maybeSingle(); // Use maybeSingle instead of single to prevent errors

    if (userError || !userProfile) {
      console.error('User profile error or no user profile found:', 
                    userError, 
                    'Email:', email);
                    
      // Log all available tables to see if user_profiles exists
      const { data: tables } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
        
      console.log('Available tables:', tables?.map(t => t.table_name));
                    
      // Try to find user directly in auth.users table as fallback
      const { data: authUsers, error: authUserError } = await supabase.auth.admin.listUsers();
      
      if (authUserError) {
        console.error('Auth user error:', authUserError);
        throw new Error('User profile not found');
      }
      
      console.log('Total auth users found:', authUsers.users.length);
      // Find a matching user case-insensitively
      const user = authUsers.users.find(
        u => u.email && u.email.toLowerCase() === email.toLowerCase()
      );
      
      if (!user) {
        console.error('No matching auth user found for email:', email);
        throw new Error('User profile not found');
      }
      
      console.log('Found user in auth system:', user.id, user.email);
      
      // Update the user's password using Supabase Auth Admin API
      const { error: passwordUpdateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      );
      
      if (passwordUpdateError) {
        throw new Error(`Failed to update password: ${passwordUpdateError.message}`);
      }
      
      // Mark verification code as used
      const { error: updateError } = await supabase
        .from('verification_codes')
        .update({ 
          status: 'used',
          used_at: new Date().toISOString()
        })
        .eq('id', verificationData.id);

      if (updateError) {
        console.warn('Failed to mark verification code as used:', updateError);
        // Don't fail the password reset for this
      }
      
      // Return success result
      return { 
        success: true, 
        message: 'Password reset successfully',
        data: {
          user: {
            id: user.id,
            email: user.email
          },
          resetAt: new Date().toISOString(),
          method: 'auth_fallback'
        }
      };
    }

    // Update the user's password using Supabase Auth Admin API
    const { error: passwordUpdateError } = await supabase.auth.admin.updateUserById(
      userProfile.auth_user_id,
      { password: newPassword }
    );

    if (passwordUpdateError) {
      throw new Error(`Failed to update password: ${passwordUpdateError.message}`);
    }

    // Mark verification code as used
    const { error: updateError } = await supabase
      .from('verification_codes')
      .update({ 
        status: 'used',
        used_at: new Date().toISOString()
      })
      .eq('id', verificationData.id);

    if (updateError) {
      console.warn('Failed to mark verification code as used:', updateError);
      // Don't fail the password reset for this
    }

    // Return success result
    return { 
      success: true, 
      message: 'Password reset successfully',
      data: {
        user: {
          id: userProfile.id,
          email: userProfile.email
        },
        resetAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Password reset error:', error);
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

    const result = await handlePasswordReset(email, newPassword);
    
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
