import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  type KeyboardEvent,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, spacing } from "@/constants/theme";
import { adminGate } from "@/services/adminGate";

type AdminUnlockGateProps = {
  onUnlocked: () => void;
  onCancel?: () => void;
};

/**
 * One-time admin device password. After success, {@link adminGate} persists until app data is cleared.
 */
export const AdminUnlockGate: React.FC<AdminUnlockGateProps> = ({ onUnlocked, onCancel }) => {
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [keyboardBottom, setKeyboardBottom] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = (e: KeyboardEvent): void => {
      setKeyboardBottom(e.endCoordinates.height);
    };
    const onHide = (): void => {
      setKeyboardBottom(0);
    };
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const submit = (): void => {
    void (async () => {
      setError(null);
      setBusy(true);
      try {
        const ok = await adminGate.verifyPassword(password);
        if (!ok) {
          setError("Incorrect password.");
          return;
        }
        onUnlocked();
      } finally {
        setBusy(false);
      }
    })();
  };

  const scrollPadBottom = spacing.xl + insets.bottom + keyboardBottom;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 12 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollInner, { paddingBottom: scrollPadBottom }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="lock" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>Admin portal unlock</Text>
          <Text style={styles.subtitle}>
            Enter the admin portal password for this device. After you are in, admins can change it from Admin → Choose
            city → Admin portal device password. You will not be asked again on this device until app data is cleared or
            the app is reinstalled.
          </Text>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Admin password"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={() => submit()}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
            onPress={() => submit()}
            disabled={busy || password.trim().length === 0}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Unlock admin access</Text>
            )}
          </Pressable>
          {onCancel ? (
            <Pressable style={styles.cancelBtn} onPress={onCancel} disabled={busy}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background
  },
  scroll: {
    flex: 1
  },
  scrollInner: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg
  },
  card: {
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EAF1FF",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.md
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.sm
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: spacing.lg
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  error: {
    color: "#B91C1C",
    fontSize: 13,
    marginBottom: spacing.sm
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs
  },
  primaryBtnPressed: {
    opacity: 0.9
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800"
  },
  cancelBtn: {
    marginTop: spacing.md,
    alignSelf: "center",
    paddingVertical: spacing.sm
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary
  }
});
