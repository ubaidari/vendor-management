import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, spacing } from "@/constants/theme";
import { useTaskStore } from "@/hooks/useTaskStore";
import { adminGate } from "@/services/adminGate";
import { appRoleMode } from "@/services/appRoleMode";
import { locationSession } from "@/services/locationSession";
import { verifyVendorPortalPinOnServer } from "@/services/vendorPortalApi";

export default function VendorLocationScreen() {
  const { refresh } = useTaskStore();
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [vendorOnlyDevice, setVendorOnlyDevice] = useState(false);

  useEffect(() => {
    void appRoleMode.get().then((m) => {
      setVendorOnlyDevice(m === "vendor");
    });
  }, []);

  const submitPin = async (): Promise<void> => {
    const trimmed = pin.trim();
    if (!trimmed) {
      Alert.alert("PIN required", "Enter the vendor portal PIN for your city.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await verifyVendorPortalPinOnServer(trimmed);
      await locationSession.persist("vendor", result.slug, result.name, result.pinVersion);
      await refresh();
      router.replace("/vendor/my-tasks");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign-in failed.";
      Alert.alert("Incorrect PIN", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {!vendorOnlyDevice ? (
          <Pressable style={styles.backRow} onPress={() => router.replace("/")}>
            <MaterialIcons name="arrow-back" size={18} color={colors.primary} />
            <Text style={styles.backText}>Portals</Text>
          </Pressable>
        ) : null}

        <View style={styles.iconCircle}>
          <MaterialIcons name="lock" size={28} color={colors.primary} />
        </View>
        <Text style={styles.title}>Vendor sign-in</Text>
        <Text style={styles.subtitle}>
          Enter your city&apos;s vendor PIN (set by your admin). This device will remember your city until you log
          out, the PIN is changed, or the app is reinstalled.
        </Text>

        <Text style={styles.label}>City PIN</Text>
        <TextInput
          value={pin}
          onChangeText={setPin}
          placeholder="Enter PIN"
          placeholderTextColor={colors.textSecondary}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={12}
          editable={!submitting}
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={() => void submitPin()}
        />

        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          onPress={() => void submitPin()}
          disabled={submitting || pin.trim().length === 0}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Continue</Text>
          )}
        </Pressable>

        {__DEV__ ? (
          <Pressable
            style={styles.devResetRow}
            onPress={() => {
              void (async () => {
                await adminGate.clear();
                await appRoleMode.clear();
                await locationSession.clear();
                router.replace("/");
              })();
            }}
          >
            <Text style={styles.devResetText}>Reset first-run choice (dev only)</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background
  },
  root: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 40
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.lg
  },
  backText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 14
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    alignSelf: "center"
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: "center"
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
    textAlign: "center"
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 18,
    letterSpacing: 4,
    color: colors.textPrimary,
    marginBottom: spacing.md
  },
  primaryButton: {
    backgroundColor: "#166534",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonPressed: {
    opacity: 0.92
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800"
  },
  devResetRow: {
    marginTop: spacing.xl,
    alignSelf: "center",
    paddingVertical: spacing.sm
  },
  devResetText: {
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: "underline",
    textAlign: "center"
  }
});
