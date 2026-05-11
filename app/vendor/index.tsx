import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors } from "@/constants/theme";
import { apiClient } from "@/services/apiClient";
import { locationSession } from "@/services/locationSession";
import { fetchVendorPortalPinStatus } from "@/services/vendorPortalApi";

/**
 * If a vendor session exists and the server PIN generation still matches this device, skip PIN.
 * If the admin changed the PIN (version mismatch), clear the session so the vendor must sign in again.
 */
const VendorIndex: React.FC = () => {
  const [ready, setReady] = useState(false);
  const [skipPin, setSkipPin] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      // Shares one native multiGet with TaskProvider (deduped in locationSession).
      await locationSession.hydrateFromStorage();
      if (!alive) {
        return;
      }
      const vendorSession =
        apiClient.hasLocationSession() && apiClient.getSessionRole() === "vendor";

      if (vendorSession) {
        const storedVersion = await locationSession.getStoredVendorPinVersion();
        try {
          const { pinVersion } = await fetchVendorPortalPinStatus();
          if (storedVersion === null || storedVersion !== pinVersion) {
            await locationSession.clear();
            if (!alive) {
              return;
            }
            setSkipPin(false);
            setReady(true);
            return;
          }
        } catch {
          await locationSession.clear();
          if (!alive) {
            return;
          }
          setSkipPin(false);
          setReady(true);
          return;
        }
      }

      if (!alive) {
        return;
      }
      setSkipPin(vendorSession);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (skipPin) {
    return <Redirect href="/vendor/my-tasks" />;
  }

  return <Redirect href="/vendor/location" />;
};

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center"
  }
});

export default VendorIndex;
