import { createClient } from '@supabase/supabase-js';

export async function handleCodeVerification(email: string, code: string) {
  try {
    // Validate inputs
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }
    
    // Log the code for debugging
    console.log('Validating code format:', code);
    
    // Use a simpler validation approach
    if (!code || !code.startsWith('SMCBI-') || code.length < 11) {
      console.error('Invalid code format:', code);
      throw new Error('Invalid verification code format. Expected: SMCBI-######');
    }
    
    // Standardize the code format to ensure consistent matching
    code = code.toUpperCase();

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

    // Find the verification code
    const { data: verificationData, error: verificationError } = await supabase
      .from('verification_codes')
      .select('*')
      .ilike('email', email) // Case-insensitive email match
      .eq('verification_code', code)
      .eq('purpose', 'password_reset')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }) // Get the most recent code
      .limit(1)
      .maybeSingle(); // Use maybeSingle instead of single to prevent errors
      
    if (verificationError || !verificationData) {
      console.error('Verification error or no verification data found:', 
                    verificationError, 
                    'Email:', email, 
                    'Code:', code);
      throw new Error('Invalid verification code');
    }

    // Check if code has expired
    const now = new Date();
    const expiresAt = new Date(verificationData.expires_at);
    
    if (now > expiresAt) {
      throw new Error('Verification code has expired');
    }

    // Check if max attempts exceeded
    if (verificationData.attempts >= verificationData.max_attempts) {
      throw new Error('Maximum verification attempts exceeded');
    }

    // Mark code as verified
    const { error: updateError } = await supabase
      .from('verification_codes')
      .update({ 
        status: 'verified',
        verified_at: now.toISOString(),
        attempts: verificationData.attempts + 1
      })
      .eq('id', verificationData.id);

    if (updateError) {
      throw new Error('Failed to verify code');
    }

    // Return success result
    return { 
      success: true, 
      message: 'Verification code verified successfully',
      data: {
        email: email,
        verificationId: verificationData.id,
        verifiedAt: now.toISOString()
      }
    };

  } catch (error) {
    console.error('Code verification error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error occurred' };
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
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const result = await handleCodeVerification(email, code);
    
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

