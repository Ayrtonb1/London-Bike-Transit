# Android Setup — Navelo

## Prerequisites (on your Mac)

- **Android Studio** — download from https://developer.android.com/studio
- **Java 17+** — bundled with Android Studio
- **Google Play Console account** — https://play.google.com/console (~$25 one-time fee)

---

## Step 1 — Add app icons

Replace the placeholder icons in:
```
android/app/src/main/res/
  mipmap-mdpi/ic_launcher.png        (48×48)
  mipmap-hdpi/ic_launcher.png        (72×72)
  mipmap-xhdpi/ic_launcher.png       (96×96)
  mipmap-xxhdpi/ic_launcher.png      (144×144)
  mipmap-xxxhdpi/ic_launcher.png     (192×192)
  mipmap-xxxhdpi/ic_launcher_round.png (192×192)
```
Use the same Navelo icon as iOS. Android Studio has an **Image Asset Studio** (right-click `res` → New → Image Asset) that can auto-generate all sizes from one source image.

---

## Step 2 — Open in Android Studio (on your Mac)

Pull the latest code, then from the project root:
```bash
cd artifacts/london-bike-transit
pnpm run android:sync   # builds web bundle + copies into android/
pnpm run android:open   # opens Android Studio
```

---

## Step 3 — Set app version in Android Studio

In `android/app/build.gradle`:
```gradle
defaultConfig {
    applicationId "com.ayrton.navelo"
    versionCode 1       # increment for each Play Store upload
    versionName "1.0"
}
```

---

## Step 4 — Create a signed release build

1. In Android Studio: **Build → Generate Signed Bundle/APK**
2. Choose **Android App Bundle** (AAB) — Play Store requires this
3. Create a new keystore (keep it safe — you need it for every future update):
   - Key store path: somewhere secure on your Mac
   - Alias: `navelo`
4. Choose **Release** build variant → Finish
5. Output: `android/app/release/app-release.aab`

---

## Step 5 — Upload to Google Play Console

1. Go to https://play.google.com/console
2. Create a new app → "Navelo" → App → Games & apps
3. Fill in store listing (description, screenshots, icon)
4. Go to **Release → Production → Create new release**
5. Upload `app-release.aab`
6. Submit for review (~hours to days, much faster than App Store)

---

## Updating the app

Each time you make changes:
```bash
pnpm run android:sync   # rebuild web + sync to android/
```
Then in Android Studio: bump `versionCode`, generate a new signed AAB, upload to Play Console.

---

## Differences from iOS

| Feature | iOS | Android |
|---------|-----|---------|
| Geolocation | ✅ works | ✅ works (permissions added to manifest) |
| Haptics | ✅ works | ✅ works |
| Share | ✅ works | ✅ works |
| Status bar | ✅ works | ✅ works |
| Splash screen | ✅ works | ✅ works |
| Maps (MapLibre) | ✅ works | ✅ works |
