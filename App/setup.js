#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 SMCBI Portal App Setup');
console.log('========================\n');

// Check if app.json exists
const appJsonPath = path.join(__dirname, 'app.json');
if (!fs.existsSync(appJsonPath)) {
  console.error('❌ app.json not found. Please make sure you are in the correct directory.');
  process.exit(1);
}

console.log('📋 Next steps to make your app downloadable:\n');

console.log('1. Login to Expo:');
console.log('   npx expo login\n');

console.log('2. Initialize EAS Build:');
console.log('   npx eas build:configure\n');

console.log('3. Update app.json with your details:');
console.log('   - Replace "your-expo-username" with your Expo username');
console.log('   - Replace "your-project-id-here" with the project ID from EAS\n');

console.log('4. Build downloadable APK:');
console.log('   npm run build:android\n');

console.log('5. For iOS builds:');
console.log('   npm run build:ios\n');

console.log('📱 Distribution Options:');
console.log('   • Direct APK sharing (Android)');
console.log('   • Google Play Store (requires $25 developer account)');
console.log('   • Apple App Store (requires $99/year developer account)');
console.log('   • TestFlight for iOS beta testing\n');

console.log('✅ Setup complete! Follow the steps above to build your downloadable app.'); 