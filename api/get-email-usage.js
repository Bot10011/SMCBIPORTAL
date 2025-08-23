import { getEmailUsage } from './get-email-usage.ts';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    // Call the handler function from the TypeScript file
    const result = await getEmailUsage();

    // If getting usage data failed
    if (!result.success) {
      return res.status(400).json(result);
    }

    // Return success response
    return res.status(200).json(result);
  } catch (error) {
    console.error('Email usage error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'An unexpected error occurred'
    });
  }
}
