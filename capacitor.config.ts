import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Production Capacitor config — used for App Store / Play Store builds.
 *
 * The app loads the bundled `dist/` web assets from the device, which is
 * required for Apple App Store submission. There is intentionally NO
 * `server.url` and NO `cleartext: true` here — those would (a) get the
 * app rejected by Apple and (b) require the device to have network
 * access to load the UI at all.
 *
 * For in-development hot-reload from the Lovable preview, copy this file
 * to `capacitor.config.dev.ts` (or set CAPACITOR_CONFIG=dev) and add a
 * `server` block pointing at the preview URL. Do NOT commit that file
 * into a release build.
 */
const config: CapacitorConfig = {
  appId: 'com.fireopshq.app',
  appName: 'FireOps HQ',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0A0A0A',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
