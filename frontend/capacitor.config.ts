import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jerry.voicehome',
  appName: 'Jerry',
  webDir: 'build',
  server: {
    // Allow the WebView to load LAN IPs over plain HTTP.
    androidScheme: 'http',
    cleartext: true,
  },
  android: {
    // Permit connections to http://192.168.x.x (LAN Node.js server)
    allowMixedContent: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
