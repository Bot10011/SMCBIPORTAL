import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function handlePasswordReset(email: string) {
  try {
    console.log('🔍 Starting password reset for email:', email);
    console.log('🌍 Environment check:', {
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV || 'development'
    });

    // Validate email
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }

    // Check environment variables
    const resendApiKey = process.env.RESEND_API_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is not configured');
    }
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for rate limiting - Allow only 3 emails per email address per day
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const { data: recentEmails, error: countError } = await supabase
      .from('verification_codes')
      .select('created_at')
      .eq('email', email)
      .eq('purpose', 'password_reset')
      .gte('created_at', twentyFourHoursAgo.toISOString());
    
    if (countError) {
      console.error('Error checking rate limit:', countError);
    } else if (recentEmails && recentEmails.length >= 3) {
      return {
        success: false,
        message: 'You have reached the maximum number of password reset requests (3) in 24 hours. Please try again tomorrow.'
      };
    }

    // Look up the user - try user_profiles first, then auth.users as fallback
    let userProfile = null;
    
    console.log('🔍 Looking up user in user_profiles table...');
    // First try to find user in user_profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name')
      .eq('email', email)
      .single();

    if (profileError) {
      console.log('❌ User not found in user_profiles table:', profileError.message);
      console.log('🔍 Trying auth.users as fallback...');
      
      // If not found in user_profiles, try to find in auth.users
      try {
        console.log('🔑 Attempting to list auth users...');
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
          console.error('❌ Error accessing auth.users:', authError);
          console.error('🔍 Auth error details:', JSON.stringify(authError, null, 2));
          
          // Check if it's a network connectivity issue
          if (authError.message.includes('fetch failed') || authError.message.includes('network') || authError.message.includes('timeout')) {
            throw new Error(`Network connectivity issue: Unable to reach Supabase. Please check your internet connection and try again. Error: ${authError.message}`);
          }
          
          throw new Error(`Unable to access user authentication data: ${authError.message}`);
        }
        
        console.log(`✅ Successfully retrieved ${authUsers.users.length} auth users`);
        
        // Find user by email (case-insensitive)
        const authUser = authUsers.users.find(
          u => u.email && u.email.toLowerCase() === email.toLowerCase()
        );
        
        if (authUser) {
          console.log('✅ Found user in auth.users:', {
            id: authUser.id,
            email: authUser.email,
            metadata: authUser.user_metadata
          });
          
          // Create a basic profile object from auth user
          userProfile = {
            id: authUser.id,
            email: authUser.email || email,
            first_name: authUser.user_metadata?.first_name || email.split('@')[0],
            last_name: authUser.user_metadata?.last_name || ''
          };
          
          console.log('✅ Created profile from auth user:', userProfile);
        } else {
          console.log('❌ User not found in either table');
          console.log('🔍 Available auth users:', 
            authUsers.users.map(u => ({ id: u.id, email: u.email })));
          console.log('🔍 Looking for email:', email);
          throw new Error(`User not found in system. Email: ${email}`);
        }
      } catch (authLookupError) {
        console.error('❌ Error looking up user in auth.users:', authLookupError);
        console.error('🔍 Auth lookup error details:', JSON.stringify(authLookupError, null, 2));
        const errorMessage = authLookupError instanceof Error ? authLookupError.message : 'Unknown error';
        
        // Provide more helpful error messages
        if (errorMessage.includes('fetch failed')) {
          throw new Error('Network connectivity issue: Unable to reach Supabase. This might be due to network restrictions or Supabase being temporarily unavailable.');
        }
        
        throw new Error(`User lookup failed: ${errorMessage}`);
      }
    } else {
      userProfile = profileData;
      console.log('✅ Found user in user_profiles:', userProfile);
    }

    if (!userProfile) {
      throw new Error('User not found');
    }

    // Generate a random 6-digit verification code with SMCBI prefix
    const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCode = `SMCBI-${randomDigits}`;
    
    // Set expiry time (15 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Save verification code to database
    const { error: insertError } = await supabase
      .from('verification_codes')
      .insert({
        email: email,
        verification_code: verificationCode,
        user_profile_id: userProfile.id,
        purpose: 'password_reset',
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        attempts: 0,


        max_attempts: 3
      });

    if (insertError) {
      console.error('Error inserting verification code:', JSON.stringify(insertError, null, 2));
      throw new Error(`Failed to save verification code: ${insertError.message || insertError.details || JSON.stringify(insertError)}`);
    }

    // Initialize Resend
    const resend = new Resend(resendApiKey);

        // Send email with verification code
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'SMCBI Portal <onboarding@resend.dev>',
      to: [email],
      subject: 'Password Reset Verification Code',
      html: `
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Password Reset</title>
          <!--[if mso]>
          <style type="text/css">
            body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
          </style>
          <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f9fc;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%; background-color: #f7f9fc;">
            <tr>
              <td align="center" valign="top" style="padding: 40px 10px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                  <!-- Header with School Logo and Name -->
                  <tr>
                    <td align="center" valign="top">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #031730, #0a4b8f); border-top-left-radius: 10px; border-top-right-radius: 10px;">
                        <tr>
                          <td align="center" style="padding: 30px 30px 20px 30px;">
                            <!-- Inline Base64 encoded logo to avoid email client warnings -->
                            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF+mlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78i iglkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDAgNzkuMTYwNDUxLCAyMDE3LzA1LzA2LTAxOjA4OjIxICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpypmY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgKE1hY2ludG9zaCkiIHhtcDpDcmVhdGVEYXRlPSIyMDIwLTAzLTI2VDE5OjQwOjM5KzA1OjMwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMC0wMy0yNlQxOTo0MTo0NiswNTozMCIgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyMC0wMy0yNlQxOTo0MTo0NiswNTozMCIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJzUkdCIElFQzYxOTY2LTIuMSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo0YjZmYzQ4OS1iMDVlLTQxODItODk0ZC05ZjcyMDk1NDU5NzAiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDpiMjNkM2FiYy1jMzA4LTM5NGItYmM4My1mNzZmMmU4ZGZiOTAiIHhtcE1N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" alt="SMCBI Logo" style="max-width: 180px; height: auto; display: block; margin: 0 auto;">
                            <h1 style="color: #ffffff; margin: 15px 0 0 0; font-size: 26px; letter-spacing: 1px; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); font-weight: 600;">School Portal & Enrollment System</h1>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
            
                
                      
                      <!-- Personal Greeting -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="padding: 25px 0 10px 0;">
                            <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #374151;">Hello <strong>${userProfile.first_name || 'there'}</strong>,</p>
                            <p style="margin: 15px 0 0 0; font-size: 16px; line-height: 1.6; color: #374151;">We received a request to reset your password for your Student Portal account. Please use the verification code below:</p>
                          </td>
                        </tr>
                      </table>
              
                      <!-- Verification Code Section -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td align="center" style="padding: 25px 0;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 85%; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
                              <tr>
                                <td align="center" style="padding: 25px 15px 20px 15px;">
                                  <p style="margin: 0 0 15px 0; font-size: 15px; color: #4b5563;">Your verification code is:</p>
                                  <table border="0" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #031730, #0a4b8f); border-radius: 6px; min-width: 240px;">
                                    <tr>
                                      <td align="center" style="padding: 20px 30px;">
                                        <p style="margin: 0; font-size: 32px; font-weight: bold; color: #ffffff; letter-spacing: 3px; text-shadow: 1px 1px 2px rgba(0,0,0,0.2); font-family: 'Courier New', monospace;">${verificationCode}</p>
                                      </td>
                                    </tr>
                                  </table>
                                  <p style="margin: 20px 0 0 0; font-size: 13px; color: #6b7280; padding-top: 15px; border-top: 1px dashed #e5e7eb;">Copy this code and paste it in the verification field on the password reset page.</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
              
                      <!-- Important Information Section -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="padding: 15px 0 25px 0;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f7ff; border-radius: 8px; border-left: 3px solid #0066cc;">
                              <tr>
                                <td style="padding: 20px;">
                                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                      <td style="padding-bottom: 12px;">
                                        <table border="0" cellpadding="0" cellspacing="0">
                                          <tr>
                                            <td width="24" style="vertical-align: top;">
                                              <div style="width: 24px; height: 24px; border-radius: 50%; background-color: #0066cc; color: white; font-weight: bold; text-align: center; line-height: 24px; font-size: 14px;">i</div>
                                            </td>
                                            <td style="padding-left: 10px;">
                                              <p style="margin: 0; font-weight: 600; color: #031730; font-size: 16px;">Important Information</p>
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
                                          <li style="margin-bottom: 8px;"><span style="color: #031730; font-weight: 600;">Time Sensitive:</span> This code will expire in <strong>15 minutes</strong>.</li>
                                          <li style="margin-bottom: 8px;"><span style="color: #031730; font-weight: 600;">Security:</span> If you didn't request this password reset, please ignore this email or contact support.</li>
                                          <li><span style="color: #031730; font-weight: 600;">One-time Use:</span> This code can only be used once to reset your password.</li>
                                        </ul>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
              

                  
                  <!-- Footer -->
                  <tr>
                    <td>
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #031730, #0a4b8f); border-bottom-left-radius: 10px; border-bottom-right-radius: 10px;">
                        <tr>
                          <td align="center" style="padding: 25px 30px;">
                            <p style="margin: 0 0 15px 0; color: #ffffff; font-size: 14px;">This is an automated message. Please do not reply to this email.</p>
                            <p style="margin: 0; color: #a0b7d5; font-size: 13px;">&copy; ${new Date().getFullYear()} St. Mary's College of Bansalan, Inc. All rights reserved.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      throw new Error(`Failed to send email: ${emailError.message || JSON.stringify(emailError)}`);
    }

    // Return success result
    return {
      success: true,
      message: 'Password reset email sent successfully',
      data: {
        email: email,
        verificationCode: verificationCode,
        expiresAt: expiresAt.toISOString(),
        emailId: emailData?.id
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

// Check if this file is being run directly (for testing)
if (process.argv[1] === import.meta.url) {
  const email = process.env.email;
  
  if (!email) {
    console.error('Usage: email=<email> tsx send-password-reset-email.ts');
    process.exit(1);
  }
  
  // Actually call the function and output the result
  handlePasswordReset(email)
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
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
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('Password reset request received for email:', email);
    console.log('Environment check - SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
    console.log('Environment check - RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Set' : 'Not set');
    console.log('Environment check - SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');

    const result = await handlePasswordReset(email);
    
    if (result.success) {
      console.log('Password reset successful for:', email);
      return res.status(200).json(result);
    } else {
      console.log('Password reset failed for:', email, 'Reason:', result.message);
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
