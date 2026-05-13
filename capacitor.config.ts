import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.paving.calculator',
  appName: 'Paving Calculator',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    // Lock the WebView to the bundled assets only — this app makes zero
    // network calls and should refuse all external navigation.
    allowNavigation: [],
  },
  plugins: {
    SplashScreen: {
      // 800ms is plenty for a static WebView (~200ms to first paint);
      // 2000ms felt like the app was hung.
      launchShowDuration: 800,
      launchAutoHide: true,
      backgroundColor: '#0a0f1a',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      backgroundColor: '#0a0f1a',
      style: 'LIGHT',
    },
  },
};

export default config;
