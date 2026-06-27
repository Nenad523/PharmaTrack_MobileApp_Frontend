module.exports = {
  expo: {
    name: "PharmaTrack",
    slug: "pharmatrack",
    version: "1.0.0",
    scheme: "pharmatrack",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
      androidNavigationBar: {
        visible: "immersive",
      },
      package: "com.nenadpsorganization.pharmatrack",
      googleServicesFile: "./google-services.json",
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "react-native-maps",
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#2563eb",
        },
      ],
      [
        "expo-av",
        {
          microphonePermission:
            "PharmaTrack koristi mikrofon za glasovnu pretragu lijekova.",
        },
      ],
    ],
    extra: {
      router: {},
      eas: {
        projectId: "c9266b33-cfec-488c-8646-a3e2ce96279e",
      },
    },
    owner: "nenadps-organization",
  },
};
