# Navelo — iOS Build & App Store Submission Guide

This project is set up as a Capacitor app so the existing React/Vite web app
can be shipped to the Apple App Store as a native iOS app. The web build and
the iOS build share 100% of the UI and business logic.

**Bundle identifier:** `com.ayrton.navelo`
**App name:** Navelo

---

## One-time setup (on your Mac)

You'll need:

- macOS with **Xcode 15+** installed (free from the Mac App Store).
- An **Apple Developer Program** membership ($99/year) for App Store submission.
- **Node.js 22+** and **pnpm** (`npm install -g pnpm`). Capacitor 8 requires Node 22+.

### 1. Clone the repo to your Mac

```bash
git clone <your repo URL>
cd <repo>
pnpm install
```

### 2. Native dependencies

Capacitor 8 uses **Swift Package Manager** (no CocoaPods required). The
plugin packages are resolved automatically the first time Xcode opens the
project — give it a minute on first launch while it fetches them.

---

## Day-to-day workflow

Whenever you change web code (React/CSS/etc.) and want to see it in the
iOS app:

```bash
# From artifacts/london-bike-transit:
pnpm run ios:sync     # Builds the web bundle and copies it into the iOS app
pnpm run ios:open     # Opens the project in Xcode
```

In Xcode:

1. Select an iOS Simulator (e.g. **iPhone 15 Pro**) from the device dropdown.
2. Click the ▶ Play button to build and run.

---

## What's already wired up

| Native feature | What it does |
| --- | --- |
| **Geolocation** | The 📍 button next to "Where from?" prompts for native iOS location permission and fills in the user's current coordinates. |
| **Haptics** | Light tap feedback when selecting a journey or tapping "View on map"; success buzz when route results arrive. |
| **Status bar** | Configured for white background with dark icons to match the app. |
| **Splash screen** | Hidden automatically once the React tree mounts. |
| **Share sheet** | Available via `shareJourney()` in `src/lib/native.ts` — wired into the API but not yet surfaced in the UI; add a share button in `JourneyCard` if you want it. |
| **Keyboard handling** | Native iOS resize behaviour configured. |
| **App Transport Security** | Default (HTTPS-only) — all our API calls are HTTPS. |

The Info.plist already includes the `NSLocationWhenInUseUsageDescription`
that Apple requires before any location request — without it, the app crashes
the first time the user taps the location button.

---

## Submitting to the App Store

### 1. App Store Connect

- Sign in at <https://appstoreconnect.apple.com> with your Apple Developer
  account.
- Click **My Apps → +** and create a new app:
  - Platform: **iOS**
  - Name: **Navelo**
  - Bundle ID: **com.ayrton.navelo** (must match exactly — register it under
    Certificates, Identifiers & Profiles first if it doesn't appear in the
    dropdown).
  - SKU: any unique string (e.g. `navelo-ios-1`).
  - Primary language: English (UK).

### 2. Configure the build in Xcode

Open the project (`pnpm run ios:open`) and:

1. Click the **App** target in the project navigator.
2. Go to **Signing & Capabilities** and pick your Apple Developer Team.
3. Bump **Version** (e.g. 1.0.0) and **Build** (start at 1, increment for
   each upload).
4. Choose **Any iOS Device (arm64)** as the build destination.
5. Menu: **Product → Archive**. When the archive completes the Organizer
   window opens.
6. Click **Distribute App → App Store Connect → Upload**. Xcode handles
   signing, packaging, and uploading.

### 3. Submit for review

Back in App Store Connect:

- Fill in the app metadata: description, screenshots (at least one set for
  iPhone 6.7" / 6.5"), keywords, support URL, privacy policy URL.
- Under **Privacy → Data Collection**, declare that you collect location
  (used only on-device for route planning, not linked to identity).
- Under **App Privacy** also note that you talk to TfL, OpenFreeMap and
  Nominatim APIs.
- Pick the build you just uploaded and click **Submit for Review**.

Apple's review typically takes 24–72 hours. Common rejection reasons for
WebView-based apps:

- **Insufficient native value** — we mitigated this by wiring Geolocation
  and Haptics into the UI.
- **Missing privacy descriptions** — already included for location.
- **No support URL or privacy policy** — you must host both before submitting.

---

## Troubleshooting

- **"No such module 'Capacitor'"** in Xcode → in Xcode menu choose
  **File → Packages → Reset Package Caches**, then **Resolve Package
  Versions**. Capacitor 8 uses Swift Package Manager rather than CocoaPods.
- **Blank white screen on launch** → make sure `pnpm run ios:sync` ran with
  `BUILD_TARGET=ios` (the `ios:sync` script does this for you).
- **"Network request failed"** → check that the API hostnames are reachable
  from the device; on the simulator try toggling Wi-Fi.
- **Location permission never appears** → the `NSLocationWhenInUseUsageDescription`
  must be present in `ios/App/App/Info.plist`. It is.
