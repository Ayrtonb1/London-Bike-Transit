import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ayrton.navelo",
  appName: "Navelo",
  // The web app is built into dist/public by Vite. `npx cap sync` copies this
  // folder into the native app bundle so it ships offline as the app shell.
  webDir: "dist/public",
  ios: {
    contentInset: "always",
    backgroundColor: "#ffffff",
    scrollEnabled: true,
  },
  android: {
    backgroundColor: "#ffffff",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#ffffff",
      iosSpinnerStyle: "small",
      androidSpinnerStyle: "small",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#ffffff",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "native",
      style: "DEFAULT",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
