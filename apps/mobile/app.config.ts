export default {
  expo: {
    name: 'Café René',
    icon: '../../packages/assets/brand/app-icon.png',
    slug: 'cafe-rene-gloucester',
    version: '1.0.0',
    scheme: 'caferene',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    // Keep build/update compatibility stable across Windows and EAS macOS.
    // Bump this value and rebuild when native dependencies, plugins or permissions change.
    runtimeVersion: '1.0.0-native.3',
    updates: {
      url: 'https://u.expo.dev/77d77412-91fc-4ac2-aa57-16abb1aeff1c',
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 3000,
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER || 'uk.co.caferene.gloucester',
      infoPlist: { CFBundleDisplayName: 'Café René', ITSAppUsesNonExemptEncryption: false },
    },
    android: {
      package: process.env.ANDROID_PACKAGE || 'uk.co.caferene.gloucester',
      adaptiveIcon: {
        foregroundImage: '../../packages/assets/brand/app-icon-adaptive.png',
        backgroundColor: '#faf7ed',
      },
      permissions: ['CAMERA', 'ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
      blockedPermissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.ACCESS_BACKGROUND_LOCATION',
      ],
    },
    plugins: [
      'expo-notifications',
      [
        'expo-camera',
        {
          cameraPermission: 'Scan a table or check-in QR code at Café René.',
          microphonePermission: false,
          recordAudioAndroid: false,
          barcodeScannerEnabled: true,
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysPermission: false,
          locationAlwaysAndWhenInUsePermission: false,
          isIosBackgroundLocationEnabled: false,
          isAndroidBackgroundLocationEnabled: false,
          isAndroidForegroundServiceEnabled: false,
          locationWhenInUsePermission:
            'Optionally check whether you are near Café René while this screen is open. Location does not award rewards and is never sent to our server.',
        },
      ],
      'expo-secure-store',
    ],
    extra: {
      eas: { projectId: '77d77412-91fc-4ac2-aa57-16abb1aeff1c' },
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://cafe-rene.onrender.com',
      webUrl: process.env.EXPO_PUBLIC_WEB_URL || 'https://cafe-rene.onrender.com',
    },
    experiments: { autolinkingModuleResolution: true },
  },
};
