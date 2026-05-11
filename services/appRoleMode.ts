import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@vendor_mgmt/app_usage_mode";

/** Who this install is for: full app (admin entry) or vendor-only shortcut. */
export type AppUsageMode = "admin" | "vendor";

let memoryMode: AppUsageMode | null | undefined;

/** Called from {@link locationSession.hydrateFromStorage} so one native read can fill this cache. */
export const primeAppUsageMode = (mode: AppUsageMode | null): void => {
  memoryMode = mode;
};

export const appRoleMode = {
  async get(): Promise<AppUsageMode | null> {
    if (memoryMode !== undefined) {
      return memoryMode;
    }
    const raw = await AsyncStorage.getItem(KEY);
    const next: AppUsageMode | null = raw === "admin" || raw === "vendor" ? raw : null;
    memoryMode = next;
    return next;
  },

  async set(mode: AppUsageMode): Promise<void> {
    memoryMode = mode;
    await AsyncStorage.setItem(KEY, mode);
  },

  async clear(): Promise<void> {
    memoryMode = undefined;
    await AsyncStorage.removeItem(KEY);
  }
};
