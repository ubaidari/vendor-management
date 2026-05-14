import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { apiClient } from "@/services/apiClient";

const DEFAULT_POLL_MS = 10_000;

/** Only skip network while the app is fully backgrounded — not `inactive` (iOS transitions, control center). */
const isAppBackgrounded = (): boolean => AppState.currentState === "background";

/**
 * Keeps task/metrics data aligned across devices (admin vs vendor) by refetching on an interval
 * while this screen is focused, and when the app returns to the foreground.
 * Polling pauses when the app is backgrounded to reduce battery and load.
 *
 * Uses `useFocusEffect` from **expo-router** (not `@react-navigation/native` alone) so effects run
 * after navigation is ready on native — same pattern Expo documents for data refresh.
 */
export function useTaskListAutoSync(refresh: () => Promise<void>, pollIntervalMs: number = DEFAULT_POLL_MS): void {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const inFlightRef = useRef(false);

  const safeRefresh = useCallback(async (): Promise<void> => {
    if (!apiClient.hasLocationSession()) {
      return;
    }
    if (isAppBackgrounded()) {
      return;
    }
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    try {
      await refreshRef.current();
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let intervalId: ReturnType<typeof setInterval> | undefined;

      const startPolling = (): void => {
        if (intervalId) {
          clearInterval(intervalId);
        }
        intervalId = setInterval(() => {
          void safeRefresh();
        }, pollIntervalMs);
      };

      const stopPolling = (): void => {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = undefined;
        }
      };

      void safeRefresh();
      // Always poll while this route is focused — do not gate on `AppState === "active"` here:
      // on native, `inactive` is common during transitions; that previously prevented polling from ever starting.
      startPolling();

      const onAppState = (next: AppStateStatus): void => {
        if (next === "background") {
          stopPolling();
        } else {
          void safeRefresh();
          startPolling();
        }
      };

      const sub = AppState.addEventListener("change", onAppState);

      return () => {
        sub.remove();
        stopPolling();
      };
    }, [pollIntervalMs, safeRefresh])
  );
}
