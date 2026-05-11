import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient, type PortalRole } from "@/services/apiClient";
import { primeAdminDevicePassword, primeAdminGateVerified } from "@/services/adminGate";
import { primeAppUsageMode } from "@/services/appRoleMode";

const KEY_ROLE = "@vendor_mgmt/portal_role";
const KEY_SLUG = "@vendor_mgmt/location_slug";
const KEY_NAME = "@vendor_mgmt/location_name";
const KEY_VENDOR_PIN_VER = "@vendor_mgmt/vendor_pin_version";
const KEY_APP_USAGE = "@vendor_mgmt/app_usage_mode";
const KEY_ADMIN_GATE = "@vendor_mgmt/admin_gate_verified";
const KEY_ADMIN_DEVICE_PASSWORD = "@vendor_mgmt/admin_device_password";

let storageHydrated = false;
let cachedVendorPinVersion: number | null = null;

/** Single in-flight hydrate so TaskProvider + vendor entry do not double-hit native storage. */
let hydratePromise: Promise<void> | null = null;

export const locationSession = {
  /**
   * @param vendorPinVersion Required for `vendor` — must match server `Location.vendorPinVersion` after PIN verify.
   */
  async persist(role: PortalRole, slug: string, locationName: string, vendorPinVersion?: number): Promise<void> {
    if (role === "admin") {
      await AsyncStorage.removeItem(KEY_VENDOR_PIN_VER);
      cachedVendorPinVersion = null;
    }
    const pairs: [string, string][] = [
      [KEY_ROLE, role],
      [KEY_SLUG, slug],
      [KEY_NAME, locationName]
    ];
    if (role === "vendor") {
      if (typeof vendorPinVersion !== "number" || !Number.isFinite(vendorPinVersion)) {
        throw new Error("Vendor session requires a valid vendorPinVersion from the server.");
      }
      const v = Math.floor(vendorPinVersion);
      pairs.push([KEY_VENDOR_PIN_VER, String(v)]);
      cachedVendorPinVersion = v;
    }
    await AsyncStorage.multiSet(pairs);
    storageHydrated = true;
    apiClient.setLocationSession(role, slug, locationName);
  },

  /** One native read: portal session, vendor PIN version cache, and app usage mode (for faster home screen). */
  async hydrateFromStorage(): Promise<void> {
    if (hydratePromise) {
      await hydratePromise;
      return;
    }
    hydratePromise = (async (): Promise<void> => {
      const entries = await AsyncStorage.multiGet([
        KEY_ROLE,
        KEY_SLUG,
        KEY_NAME,
        KEY_VENDOR_PIN_VER,
        KEY_APP_USAGE,
        KEY_ADMIN_GATE,
        KEY_ADMIN_DEVICE_PASSWORD
      ]);
      const map = Object.fromEntries(entries) as Record<string, string>;
      const role = map[KEY_ROLE] as PortalRole | undefined;
      const slug = map[KEY_SLUG];
      const name = map[KEY_NAME];
      const verRaw = map[KEY_VENDOR_PIN_VER];
      if (verRaw != null && verRaw.trim() !== "") {
        const n = Number.parseInt(verRaw, 10);
        cachedVendorPinVersion = Number.isFinite(n) ? n : null;
      } else {
        cachedVendorPinVersion = null;
      }
      const usageRaw = map[KEY_APP_USAGE];
      primeAppUsageMode(usageRaw === "admin" || usageRaw === "vendor" ? usageRaw : null);
      primeAdminGateVerified(map[KEY_ADMIN_GATE] === "1");
      primeAdminDevicePassword(map[KEY_ADMIN_DEVICE_PASSWORD]);

      if (role === "admin" || role === "vendor") {
        if (slug && name) {
          apiClient.setLocationSession(role, slug, name);
        }
      }
      storageHydrated = true;
    })();
    await hydratePromise;
  },

  /** PIN generation the device last accepted for vendor portal (vs server `vendorPinVersion`). */
  async getStoredVendorPinVersion(): Promise<number | null> {
    if (storageHydrated) {
      return cachedVendorPinVersion;
    }
    const raw = await AsyncStorage.getItem(KEY_VENDOR_PIN_VER);
    if (raw == null || raw.trim() === "") {
      return null;
    }
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  },

  async clear(): Promise<void> {
    await AsyncStorage.multiRemove([KEY_ROLE, KEY_SLUG, KEY_NAME, KEY_VENDOR_PIN_VER]);
    apiClient.clearLocationSession();
    storageHydrated = false;
    cachedVendorPinVersion = null;
    hydratePromise = null;
  }
};
