import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_VERIFIED = "@vendor_mgmt/admin_gate_verified";
/** When set, unlock and password checks use this value instead of the factory default. */
const STORAGE_CUSTOM_PASSWORD = "@vendor_mgmt/admin_device_password";

/** Factory default until an admin changes it from Admin → Vendor portal PINs (this device only). */
export const DEFAULT_ADMIN_DEVICE_PASSWORD = "Ksportaladmin1100";

const MIN_NEW_PASSWORD_LENGTH = 8;

let memoryVerified: boolean | undefined;
/** `null` after prime = use factory default; `string` = custom; `undefined` before hydrate/clear. */
let memoryCustomPassword: string | null | undefined;

/** Filled from {@link locationSession.hydrateFromStorage}. */
export const primeAdminGateVerified = (verified: boolean): void => {
  memoryVerified = verified;
};

/** Filled from {@link locationSession.hydrateFromStorage} (same multiGet). */
export const primeAdminDevicePassword = (storedPlain: string | null | undefined): void => {
  if (storedPlain == null || String(storedPlain).trim() === "") {
    memoryCustomPassword = null;
  } else {
    memoryCustomPassword = String(storedPlain).trim();
  }
};

async function getExpectedPassword(): Promise<string> {
  if (memoryCustomPassword !== undefined) {
    return memoryCustomPassword ?? DEFAULT_ADMIN_DEVICE_PASSWORD;
  }
  const raw = await AsyncStorage.getItem(STORAGE_CUSTOM_PASSWORD);
  memoryCustomPassword = raw != null && raw.trim() !== "" ? raw.trim() : null;
  return memoryCustomPassword ?? DEFAULT_ADMIN_DEVICE_PASSWORD;
}

export const adminGate = {
  async isVerified(): Promise<boolean> {
    if (memoryVerified !== undefined) {
      return memoryVerified;
    }
    const raw = await AsyncStorage.getItem(STORAGE_VERIFIED);
    memoryVerified = raw === "1";
    return memoryVerified;
  },

  /** Returns true and persists device unlock when the password matches the active device password. */
  async verifyPassword(plain: string): Promise<boolean> {
    const trimmed = plain.trim();
    const expected = await getExpectedPassword();
    if (trimmed !== expected) {
      return false;
    }
    memoryVerified = true;
    await AsyncStorage.setItem(STORAGE_VERIFIED, "1");
    return true;
  },

  /**
   * Change the admin portal device password (admin session only in UI).
   * Keeps this device unlocked — the admin already proved the current password.
   */
  async changeDevicePassword(input: {
    current: string;
    next: string;
    confirm: string;
  }): Promise<{ ok: true } | { ok: false; message: string }> {
    const current = input.current.trim();
    const next = input.next.trim();
    const confirm = input.confirm.trim();
    if (next.length < MIN_NEW_PASSWORD_LENGTH) {
      return { ok: false, message: `Use at least ${MIN_NEW_PASSWORD_LENGTH} characters for the new password.` };
    }
    if (next !== confirm) {
      return { ok: false, message: "New password and confirmation do not match." };
    }
    const expected = await getExpectedPassword();
    if (current !== expected) {
      return { ok: false, message: "Current password is incorrect." };
    }
    if (next === expected) {
      return { ok: false, message: "Choose a password that is different from the current one." };
    }
    await AsyncStorage.setItem(STORAGE_CUSTOM_PASSWORD, next);
    memoryCustomPassword = next;
    memoryVerified = true;
    await AsyncStorage.setItem(STORAGE_VERIFIED, "1");
    return { ok: true };
  },

  async clear(): Promise<void> {
    memoryVerified = undefined;
    memoryCustomPassword = undefined;
    await AsyncStorage.multiRemove([STORAGE_VERIFIED, STORAGE_CUSTOM_PASSWORD]);
  }
};
