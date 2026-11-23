import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * The Google Sign-In iOS URL scheme is the reversed iOS OAuth client ID
 * (`123-abc.apps.googleusercontent.com` -> `com.googleusercontent.apps.123-abc`).
 * It can be passed explicitly via GOOGLE_IOS_URL_SCHEME or derived from the client ID.
 */
function resolveGoogleIosUrlScheme(): string | undefined {
  if (process.env.GOOGLE_IOS_URL_SCHEME) return process.env.GOOGLE_IOS_URL_SCHEME;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!iosClientId) return undefined;
  return iosClientId.split('.').reverse().join('.');
}

const CAMERA_PERMISSION_MESSAGE =
  'Wide Impact Classroom uses the camera to scan classroom QR codes so you can join a class.';

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleIosUrlScheme = resolveGoogleIosUrlScheme();

  const plugins: ExpoConfig['plugins'] = [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFFFFF',
        image: './assets/images/splash-icon.png',
        imageWidth: 96,
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: CAMERA_PERMISSION_MESSAGE,
        microphonePermission: false,
        recordAudioAndroid: false,
        barcodeScannerEnabled: true,
      },
    ],
    'expo-secure-store',
    [
      'expo-build-properties',
      {
        // Allows plain-HTTP calls to a local backend (e.g. http://10.0.2.2:4000) during development.
        android: { usesCleartextTraffic: true },
      },
    ],
  ];

  // The Google Sign-In plugin only needs to touch native config on iOS (URL scheme).
  // Android works through autolinking alone, so the plugin is added only when a scheme is known.
  if (googleIosUrlScheme) {
    plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }]);
  }

  return {
    ...config,
    name: 'Wide Impact Classroom',
    slug: 'wide-impact-classroom',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'wideimpactclassroom',
    userInterfaceStyle: 'light',
    ios: {
      bundleIdentifier: 'com.wideimpact.classroom',
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription: CAMERA_PERMISSION_MESSAGE,
      },
    },
    android: {
      package: 'com.wideimpact.classroom',
      adaptiveIcon: {
        backgroundColor: '#8B1538',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      permissions: ['android.permission.CAMERA'],
      blockedPermissions: ['android.permission.RECORD_AUDIO'],
      predictiveBackGestureEnabled: false,
    },
    plugins,
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:4000',
      enableDevLogin: process.env.EXPO_PUBLIC_ENABLE_DEV_LOGIN === 'true',
    },
  };
};
