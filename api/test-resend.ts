import { Resend } from 'resend';

// Test script for Resend API
async function testResend() {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    console.error('❌ RESEND_API_KEY environment variable is missing');
    console.log('Please set RESEND_API_KEY in your environment variables');
    return;
  }

  console.log('✅ RESEND_API_KEY found');
  
  try {
    const resend = new Resend(resendApiKey);
    
    // Test email sending (this won't actually send an email in test mode)
    const { data, error } = await resend.emails.send({
      from: 'SMCBI Portal <noreply@smcbi.edu.ph>',
      to: ['test@example.com'],
      subject: 'Test Email - SMCBI Portal',
      html: '<p>This is a test email to verify Resend API integration.</p>',
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      return;
    }

    console.log('✅ Resend API test successful');
    console.log('Email ID:', data?.id);
    console.log('Resend API is working correctly!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testResend();





