import React from "react";
import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function VendorLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="location" options={{ headerShown: false }} />
      <Stack.Screen name="my-tasks" options={{ title: "My Tasks" }} />
      <Stack.Screen name="task-detail" options={{ title: "Task Detail" }} />
      <Stack.Screen name="history" options={{ title: "History" }} />
    </Stack>
  );
}
