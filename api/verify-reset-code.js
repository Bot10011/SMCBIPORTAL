import { handleCodeVerification } from './verify-reset-code.ts';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { email, code } = req.body;

    // Call the handler function from the TypeScript file
    const result = await handleCodeVerification(email, code);

    // If verification failed, return a 400 status
    if (!result.success) {
      return res.status(400).json(result);
    }

    // Return success response
    return res.status(200).json(result);
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'An unexpected error occurred'
    });
  }
}
