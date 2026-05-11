import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack, router } from "expo-router";
import { AdminUnlockGate } from "@/components/AdminUnlockGate";
import { colors } from "@/constants/theme";
import { adminGate } from "@/services/adminGate";

export default function AdminLayout() {
  const [gateState, setGateState] = useState<"loading" | "locked" | "unlocked">("loading");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const ok = await adminGate.isVerified();
      if (!alive) {
        return;
      }
      setGateState(ok ? "unlocked" : "locked");
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (gateState === "loading") {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (gateState === "locked") {
    return (
      <AdminUnlockGate
        onUnlocked={() => setGateState("unlocked")}
        onCancel={() => router.replace("/")}
      />
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="location" options={{ headerShown: false }} />
      <Stack.Screen name="device-password" options={{ headerShown: false }} />
      <Stack.Screen name="vendor-pins" options={{ title: "Vendor PINs" }} />
      <Stack.Screen name="dashboard" options={{ title: "Dashboard" }} />
      <Stack.Screen name="create-task" options={{ title: "Create Task" }} />
      <Stack.Screen name="tasks" options={{ title: "Tasks" }} />
      <Stack.Screen name="branches" options={{ title: "Branches" }} />
      <Stack.Screen name="reports" options={{ title: "Reports" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center"
  }
});
