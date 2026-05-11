import React, { useState } from "react";
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { colors, spacing } from "@/constants/theme";
import { adminGate } from "@/services/adminGate";

const showAlert = (title: string, message?: string): void => {
  Keyboard.dismiss();
  setTimeout(() => {
    Alert.alert(title, message ?? "");
  }, Platform.OS === "android" ? 120 : 60);
};

/**
 * Change the admin portal device lock password (stored on this device only).
 */
export const AdminPortalDevicePasswordCard: React.FC = () => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const save = (): void => {
    void (async () => {
      Keyboard.dismiss();
      setSaving(true);
      try {
        const result = await adminGate.changeDevicePassword({ current, next, confirm });
        if (!result.ok) {
          showAlert("Could not update", result.message);
          return;
        }
        setCurrent("");
        setNext("");
        setConfirm("");
        showAlert(
          "Password updated",
          "This device will use the new admin portal password from now on. Other phones or tablets keep their own setting until you change them there."
        );
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <View style={styles.card}>
      <Text style={styles.hint}>
        This lock appears when someone opens the admin area on this device. It is separate from vendor city PINs. Use
        at least 8 characters for a new password.
      </Text>
      <Text style={styles.label}>Current password</Text>
      <TextInput
        value={current}
        onChangeText={setCurrent}
        placeholder="Current admin password"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        editable={!saving}
        style={styles.input}
      />
      <Text style={styles.label}>New password</Text>
      <TextInput
        value={next}
        onChangeText={setNext}
        placeholder="New password (min. 8 characters)"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        editable={!saving}
        style={styles.input}
      />
      <Text style={styles.label}>Confirm new password</Text>
      <TextInput
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Re-enter new password"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        editable={!saving}
        style={styles.input}
      />
      <Pressable
        style={({ pressed }) => [styles.save, pressed && styles.savePressed]}
        onPress={save}
        disabled={
          saving || current.trim().length === 0 || next.trim().length === 0 || confirm.trim().length === 0
        }
      >
        <Text style={styles.saveText}>{saving ? "Saving…" : "Save admin password"}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    backgroundColor: colors.background
  },
  save: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: 10
  },
  savePressed: {
    opacity: 0.9
  },
  saveText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14
  }
});
