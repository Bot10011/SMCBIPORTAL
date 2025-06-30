# SMCBI Portal - Expo App

A simple Expo React Native app that opens the SMCBI Portal website in the device's default browser.

## Features

- Opens https://smcbiportal.vercel.app/ in the device's default browser
- Uses school logo as app icon
- Minimal and lightweight
- **Downloadable APK/IPA files for distribution**

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- EAS CLI (`npm install -g eas-cli`)
- Expo Go app on your mobile device (for testing)

### Installation

1. Navigate to the App directory:
   ```bash
   cd App
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Scan the QR code with Expo Go app on your mobile device

## Making the App Downloadable

### Setup EAS Build (Required for downloadable builds)

1. **Login to Expo:**
   ```bash
   npx expo login
   ```

2. **Initialize EAS Build:**
   ```bash
   npx eas build:configure
   ```

3. **Update app.json:**
   - Replace `"your-expo-username"` with your actual Expo username
   - Replace `"your-project-id-here"` with the project ID from EAS

### Building Downloadable Versions

#### For Android (APK file):
```bash
npm run build:android
```
This creates an APK file that can be:
- Downloaded and installed directly on Android devices
- Shared via email, cloud storage, or direct download links
- Distributed through your own website

#### For iOS (IPA file):
```bash
npm run build:ios
```
This creates an IPA file that can be:
- Installed on iOS devices through TestFlight
- Distributed through Apple App Store (requires Apple Developer account)

#### For Production (Both platforms):
```bash
npm run build:production
```

### Distribution Options

#### 1. Direct APK Distribution (Android)
- Build the APK using `npm run build:android`
- Download the APK from the EAS build link
- Share the APK file directly with users
- Users can install by enabling "Install from unknown sources"

#### 2. Google Play Store (Android)
- Build for production: `npm run build:production`
- Submit to Google Play: `npm run submit:android`
- Requires Google Play Developer account ($25 one-time fee)

#### 3. Apple App Store (iOS)
- Build for production: `npm run build:production`
- Submit to App Store: `npm run submit:ios`
- Requires Apple Developer account ($99/year)

#### 4. TestFlight (iOS Beta Testing)
- Build for preview: `npm run build:ios`
- Upload to TestFlight for beta testing
- Requires Apple Developer account

### Quick Setup for Direct Downloads

1. **Build APK for immediate distribution:**
   ```bash
   npm run build:android
   ```

2. **Wait for build to complete** (usually 10-15 minutes)

3. **Download the APK** from the provided link

4. **Share the APK file** with your users

### App Store Submission

To submit to official app stores:

1. **Google Play Store:**
   - Complete Google Play Console setup
   - Run: `npm run submit:android`

2. **Apple App Store:**
   - Complete Apple Developer setup
   - Run: `npm run submit:ios`

## App Structure

- `App.js` - Main app component that opens the portal URL
- `app.json` - Expo configuration with app name, slug, and icon settings
- `eas.json` - EAS build configuration for creating downloadable builds
- `assets/` - App icons and splash screen images
- `package.json` - Dependencies and build scripts

## How it Works

When the app launches, it displays a brief loading screen with the app name, then automatically opens the SMCBI Portal website in the device's default browser using Expo's Linking API.

## Troubleshooting

- **Build fails:** Make sure you're logged into Expo and have proper permissions
- **APK won't install:** Enable "Install from unknown sources" in Android settings
- **iOS build issues:** Ensure you have a valid Apple Developer account 