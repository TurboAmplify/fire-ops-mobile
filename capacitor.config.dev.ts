import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Development-only Capacitor config — enables hot-reload from the Lovable
 * preview when running on a physical device or simulator.
 *
 * Use this by running:
 *   npx cap run ios --config capacitor.config.dev.ts
 *
 * Do NOT use this config to produce a build for the App Store. Use the
 * default `capacitor.config.ts` for store submissions.
 */
const config: CapacitorConfig = {
  appId: 'com.fireopshq.app',
  appName: 'FireOps HQ',
  webDir: 'dist',
  server: {
    url: 'https://63e454bc-32e1-42ee-9def-17eb4240739a.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
