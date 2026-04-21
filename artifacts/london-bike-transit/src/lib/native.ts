/**
 * Thin wrapper around Capacitor plugins so the rest of the app can call
 * native iOS features without caring whether it's running inside the native
 * shell or a regular browser. On the web, every helper degrades gracefully
 * to its standard browser equivalent (or a no-op).
 */
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Share } from "@capacitor/share";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // "ios" | "android" | "web"

/** Get the user's current GPS position, prompting for permission if needed. */
export async function getCurrentLocation(): Promise<{
  lat: number;
  lon: number;
} | null> {
  try {
    if (isNative) {
      // Ensure permission first so we get a clean "denied" instead of a throw.
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== "granted") {
        const req = await Geolocation.requestPermissions();
        if (req.location !== "granted") return null;
      }
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 8000,
      });
      return { lat: pos.coords.latitude, lon: pos.coords.longitude };
    }
    // Browser fallback
    if (!("geolocation" in navigator)) return null;
    return await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 },
      );
    });
  } catch {
    return null;
  }
}

/** Light tactile feedback for taps (button press, journey selection, etc.). */
export async function hapticTap(): Promise<void> {
  if (!isNative) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* ignore */
  }
}

/** Stronger feedback for confirmations (search starts, journey found, etc.). */
export async function hapticSuccess(): Promise<void> {
  if (!isNative) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    /* ignore */
  }
}

/** Open the native iOS share sheet (or fall back to Web Share API). */
export async function shareJourney(opts: {
  title: string;
  text: string;
  url?: string;
}): Promise<void> {
  try {
    if (isNative) {
      await Share.share({ title: opts.title, text: opts.text, url: opts.url });
      return;
    }
    if ("share" in navigator) {
      await navigator.share({ title: opts.title, text: opts.text, url: opts.url });
    }
  } catch {
    /* user cancelled or unsupported — silent */
  }
}

/**
 * Configure the iOS status bar to match the app's white surface and dismiss
 * the splash screen once the app shell has rendered.
 */
export async function initNativeShell(): Promise<void> {
  if (!isNative) return;
  try {
    await StatusBar.setStyle({ style: Style.Light }); // dark icons on white bg
    await StatusBar.setBackgroundColor({ color: "#ffffff" });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {
    /* not all platforms expose every method (e.g. iOS ignores bg color) */
  }
  try {
    await SplashScreen.hide();
  } catch {
    /* ignore */
  }
}
