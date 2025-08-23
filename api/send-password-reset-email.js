import { handlePasswordReset } from './send-password-reset-email.ts';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { email } = req.body;

    // Call the handler function from the TypeScript file
    const result = await handlePasswordReset(email);

    // If sending email failed, return the appropriate status with the message
    if (!result.success) {
      // If it's a rate limit issue, use 200 status with success:false to ensure the message gets to the UI
      if (result.message && result.message.includes('maximum number')) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    }

    // Return success response
    return res.status(200).json(result);
  } catch (error) {
    console.error('Password reset email error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'An unexpected error occurred'
    });
  }
}
