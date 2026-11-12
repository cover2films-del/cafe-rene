export default {
  expo: {
    name: 'Café René',
    slug: 'cafe-rene-gloucester',
    version: '1.0.0',
    scheme: 'caferene',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER || 'uk.co.caferene.gloucester',
      infoPlist: { ITSAppUsesNonExemptEncryption: false },
    },
    android: {
      package: process.env.ANDROID_PACKAGE || 'uk.co.caferene.gloucester',
      permissions: ['CAMERA', 'ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
      blockedPermissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.ACCESS_BACKGROUND_LOCATION',
      ],
    },
    plugins: [
      [
        'expo-camera',
        {
          cameraPermission: 'Scan a table QR or a rotating venue check-in code at Café René.',
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
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001',
      webUrl: process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:5173',
    },
    experiments: { autolinkingModuleResolution: true },
  },
};
