import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.solarisapp.app',
  appName: 'solarisapp',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      overlaysWebView: true
    }
  }
};

export default config;