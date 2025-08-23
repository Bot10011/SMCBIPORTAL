#!/usr/bin/env tsx

/**
 * Test script for the complete password reset flow
 * 
 * This script tests all three API endpoints:
 * 1. Send password reset email
 * 2. Verify reset code
 * 3. Reset password
 * 
 * Usage: tsx test-password-reset.ts
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

interface TestResult {
  test: string;
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

async function runTest(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
  try {
    console.log(`\n🧪 Running test: ${testName}`);
    const result = await testFn();
    console.log(`✅ ${testName} passed`);
    return { test: testName, success: true, message: 'Test passed', data: result };
  } catch (error) {
    console.error(`❌ ${testName} failed:`, error);
    return { 
      test: testName, 
      success: false, 
      message: 'Test failed', 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

async function testEnvironmentCheck(): Promise<any> {
  const response = await fetch(`${API_BASE}/api/env-check`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return await response.json();
}

async function testSendPasswordResetEmail(email: string): Promise<any> {
  const response = await fetch(`${API_BASE}/api/send-password-reset-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
  }
  
  return await response.json();
}

async function testVerifyResetCode(email: string, code: string): Promise<any> {
  const response = await fetch(`${API_BASE}/api/verify-reset-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
  }
  
  return await response.json();
}

async function testResetPassword(email: string, newPassword: string): Promise<any> {
  const response = await fetch(`${API_BASE}/api/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, newPassword })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
  }
  
  return await response.json();
}

async function main() {
  console.log('🚀 Starting Password Reset Flow Tests');
  console.log(`📍 API Base URL: ${API_BASE}`);
  console.log('=' .repeat(60));

  const results: TestResult[] = [];
  
  // Test 1: Environment Check
  const envResult = await runTest('Environment Check', testEnvironmentCheck);
  results.push(envResult);
  
  if (!envResult.success) {
    console.log('\n❌ Environment check failed. Please check your configuration.');
    console.log('Required environment variables:');
    console.log('- RESEND_API_KEY');
    console.log('- SUPABASE_URL');
    console.log('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('\n📋 Environment Status:');
  console.log(`- Resend API Key: ${envResult.data?.data?.hasResendKey ? '✅ Configured' : '❌ Missing'}`);
  console.log(`- Supabase URL: ${envResult.data?.data?.hasSupabaseUrl ? '✅ Configured' : '❌ Missing'}`);
  console.log(`- Service Role Key: ${envResult.data?.data?.hasServiceKey ? '✅ Configured' : '❌ Missing'}`);

  // Test 2: Send Password Reset Email
  const testEmail = 'test@example.com'; // Replace with a real test email
  const sendEmailResult = await runTest('Send Password Reset Email', () => 
    testSendPasswordResetEmail(testEmail)
  );
  results.push(sendEmailResult);

  if (!sendEmailResult.success) {
    console.log('\n❌ Failed to send password reset email. Cannot continue with remaining tests.');
    process.exit(1);
  }

  // Extract verification code from the response
  const verificationCode = sendEmailResult.data?.data?.verificationCode;
  if (!verificationCode) {
    console.log('\n❌ No verification code received. Cannot continue with remaining tests.');
    process.exit(1);
  }

  console.log(`\n📧 Verification code received: ${verificationCode}`);

  // Test 3: Verify Reset Code
  const verifyCodeResult = await runTest('Verify Reset Code', () => 
    testVerifyResetCode(testEmail, verificationCode)
  );
  results.push(verifyCodeResult);

  if (!verifyCodeResult.success) {
    console.log('\n❌ Failed to verify reset code. Cannot continue with remaining tests.');
    process.exit(1);
  }

  // Test 4: Reset Password
  const newPassword = 'NewTestPass123!';
  const resetPasswordResult = await runTest('Reset Password', () => 
    testResetPassword(testEmail, newPassword)
  );
  results.push(resetPasswordResult);

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Results Summary');
  console.log('=' .repeat(60));
  
  const passedTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.test}`);
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log(`\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Password reset flow is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
    process.exit(1);
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the tests
main().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
