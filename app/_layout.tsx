import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableScreens } from "react-native-screens";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/constants/theme";
import { TaskProvider } from "@/hooks/useTaskStore";
import { configureAppAudioForAlerts } from "@/utils/playTransactionSuccessTune";

enableScreens(true);

export default function RootLayout() {
  useEffect(() => {
    configureAppAudioForAlerts().catch(() => undefined);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <TaskProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerStyle: { backgroundColor: colors.surface } }}>
            <Stack.Screen name="index" options={{ title: "Kickstart Vendor Hub" }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
            <Stack.Screen name="vendor" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)/sign-in" options={{ title: "Sign In" }} />
          </Stack>
        </TaskProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
