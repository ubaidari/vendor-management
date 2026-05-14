const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

/** LocalTunnel serves a browser warning unless this header is sent on programmatic requests. */
const tunnelBypassHeaders = (): Record<string, string> => {
  try {
    const host = new URL(API_BASE_URL).hostname.toLowerCase();
    if (host.endsWith("loca.lt") || host.includes("localtunnel")) {
      return { "Bypass-Tunnel-Reminder": "true" };
    }
  } catch {
    /* ignore invalid EXPO_PUBLIC_API_URL */
  }
  return {};
};

export type PortalRole = "admin" | "vendor";

let sessionRole: PortalRole | null = null;
let sessionSlug: string | null = null;
let sessionLocationName: string | null = null;

type SessionListener = () => void;
const sessionListeners = new Set<SessionListener>();

const notifySessionChange = (): void => {
  for (const fn of sessionListeners) {
    try {
      fn();
    } catch (e) {
      console.error("session listener", e);
    }
  }
};

export const apiClient = {
  getBaseUrl: (): string => API_BASE_URL,

  /** Subscribe to city / portal changes so task data can reset (no cross-city mixing). */
  subscribeSession: (listener: SessionListener): (() => void) => {
    sessionListeners.add(listener);
    return () => {
      sessionListeners.delete(listener);
    };
  },

  setLocationSession: (role: PortalRole, slug: string, locationName: string): void => {
    const nextSlug = slug.trim().toLowerCase();
    const slugChanged = sessionSlug !== nextSlug;
    const roleChanged = sessionRole !== role;
    sessionRole = role;
    sessionSlug = nextSlug;
    sessionLocationName = locationName;
    if (slugChanged || roleChanged) {
      notifySessionChange();
    }
  },

  clearLocationSession: (): void => {
    if (!sessionRole && !sessionSlug) {
      return;
    }
    sessionRole = null;
    sessionSlug = null;
    sessionLocationName = null;
    notifySessionChange();
  },

  getLocationHeaders: (): Record<string, string> => {
    const headers: Record<string, string> = { ...tunnelBypassHeaders() };
    if (sessionRole && sessionSlug) {
      headers["X-Location-Slug"] = sessionSlug;
      headers["X-Portal-Role"] = sessionRole;
    }
    return headers;
  },

  hasLocationSession: (): boolean => !!sessionRole && !!sessionSlug,

  getSessionRole: (): PortalRole | null => sessionRole,
  getSessionSlug: (): string | null => sessionSlug,
  getSessionLocationName: (): string | null => sessionLocationName
};
