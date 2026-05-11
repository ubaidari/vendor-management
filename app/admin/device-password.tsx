import React, { useEffect, useState } from "react";
import {
  Keyboard,
  type KeyboardEvent,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { AdminPortalDevicePasswordCard } from "@/components/AdminPortalDevicePasswordCard";
import { colors, spacing } from "@/constants/theme";

export default function AdminDevicePasswordScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
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

  const scrollBottomPad = spacing.xl * 2 + insets.bottom + keyboardBottom;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPad }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backRow} onPress={() => router.replace("/admin/location")}>
          <MaterialIcons name="arrow-back" size={18} color={colors.primary} />
          <Text style={styles.backText}>Choose city</Text>
        </Pressable>
        <Text style={styles.heading}>Admin portal device password</Text>
        <Text style={styles.subtitle}>Update the lock for opening the admin area on this phone or tablet.</Text>
        <AdminPortalDevicePasswordCard />
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
    flexGrow: 1
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.md
  },
  backText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 14
  },
  heading: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg
  }
});
