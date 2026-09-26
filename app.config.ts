import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

const rawBundleId = "com.app.qaydofficemobile";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".")
    .replace(/[^a-zA-Z0-9.]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .toLowerCase()
    .split(".")
    .map((segment) => (/^[a-zA-Z]/.test(segment) ? segment : "x" + segment))
    .join(".") || "space.manus.app";

const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const config: ExpoConfig = {
  name: "قيد | رول المحكمة",
  slug: "qayd-office-mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: schemeFromBundleId,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#141e30",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: bundleId,
    permissions: ["CAMERA"],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-sqlite",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#141e30",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "السماح للتطبيق بالوصول إلى الصور لإرفاق صورة الرول.",
        cameraPermission: "السماح للتطبيق باستخدام الكاميرا لتصوير الرول وقسائم الرسوم.",
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
