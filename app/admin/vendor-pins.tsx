import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { CITIES, type CityDefinition } from "@/constants/locations";
import { colors, spacing } from "@/constants/theme";
import { useTaskStore } from "@/hooks/useTaskStore";
import { apiClient } from "@/services/apiClient";
import { locationSession } from "@/services/locationSession";
import {
  type AdminVendorPortalPinRow,
  fetchAdminVendorPortalPins,
  patchAdminVendorPortalPin
} from "@/services/vendorPortalApi";

const windowHeight = Dimensions.get("window").height;

/** Alerts sit behind an open keyboard on some devices; dismiss first, then show after a short frame. */
const showAlert = (title: string, message?: string): void => {
  Keyboard.dismiss();
  setTimeout(() => {
    Alert.alert(title, message ?? "");
  }, Platform.OS === "android" ? 120 : 60);
};

const PinSummaryRow: React.FC<{
  row: AdminVendorPortalPinRow;
  onEdit: () => void;
}> = ({ row, onEdit }) => {
  return (
    <View style={styles.pinCard}>
      <Text style={styles.pinCity}>{row.name}</Text>
      <Text style={styles.pinSlug}>Vendor portal PIN · generation {row.vendorPinVersion}</Text>
      <Text style={styles.pinMasked}>Current PIN: {row.vendorPin.replace(/\d/g, "●")}</Text>
      <Pressable style={({ pressed }) => [styles.openModalBtn, pressed && styles.openModalBtnPress]} onPress={onEdit}>
        <MaterialIcons name="edit" size={18} color="#fff" />
        <Text style={styles.openModalBtnText}>Change PIN</Text>
      </Pressable>
    </View>
  );
};

export default function AdminVendorPinsScreen() {
  const insets = useSafeAreaInsets();
  const { refresh } = useTaskStore();
  const [rows, setRows] = useState<AdminVendorPortalPinRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [busyAuthSlug, setBusyAuthSlug] = useState<string | null>(null);

  const [pinModalSlug, setPinModalSlug] = useState<string | null>(null);
  const [pinModalValue, setPinModalValue] = useState("");

  const isAdmin = apiClient.getSessionRole() === "admin" && apiClient.hasLocationSession();

  const pinModalRow = pinModalSlug ? rows.find((r) => r.slug === pinModalSlug) : undefined;

  const closePinModal = (): void => {
    Keyboard.dismiss();
    setPinModalSlug(null);
    setPinModalValue("");
  };

  const openPinModal = (slug: string): void => {
    setPinModalValue((drafts[slug] ?? rows.find((r) => r.slug === slug)?.vendorPin ?? "").trim());
    setPinModalSlug(slug);
  };

  const loadPins = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const list = await fetchAdminVendorPortalPins();
      setRows(list);
      setDrafts(
        list.reduce<Record<string, string>>((acc, r) => {
          acc[r.slug] = r.vendorPin;
          return acc;
        }, {})
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not load vendor PINs.";
      showAlert("Error", message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadPins();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadPins]);

  const authorizeAsAdmin = async (city: CityDefinition): Promise<void> => {
    setBusyAuthSlug(city.slug);
    try {
      await locationSession.persist("admin", city.slug, city.name);
      await refresh();
      await loadPins();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not continue.";
      showAlert("Error", message);
    } finally {
      setBusyAuthSlug(null);
    }
  };

  const handleSave = async (slug: string, pin: string): Promise<void> => {
    Keyboard.dismiss();
    const trimmed = pin.trim();
    if (trimmed.length < 4) {
      showAlert("Invalid PIN", "Use at least 4 digits (up to 12).");
      return;
    }
    setSavingSlug(slug);
    try {
      const updated = await patchAdminVendorPortalPin(slug, trimmed);
      setRows((prev) => prev.map((r) => (r.slug === slug ? { ...r, ...updated } : r)));
      setDrafts((prev) => ({ ...prev, [slug]: updated.vendorPin }));
      closePinModal();
      if (updated.unchanged) {
        showAlert("Unchanged", "That PIN is already active for this city.");
      } else {
        showAlert(
          "Updated",
          `${updated.name} vendor portal PIN was updated. Vendors must sign in again.`
        );
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Save failed.";
      showAlert("Save failed", message);
    } finally {
      setSavingSlug(null);
    }
  };

  const saveFromModal = (): void => {
    if (!pinModalSlug) {
      return;
    }
    void handleSave(pinModalSlug, pinModalValue);
  };

  const keyboardOffset = Platform.OS === "ios" ? insets.top + 56 : 24;

  const managePinsBody = (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Pressable style={styles.backRow} onPress={() => router.replace("/admin/location")}>
          <MaterialIcons name="arrow-back" size={18} color={colors.primary} />
          <Text style={styles.backText}>Choose city</Text>
        </Pressable>
        <Text style={styles.title}>Vendor portal PINs</Text>
        <Text style={styles.subtitle}>
          Changing a PIN bumps its generation. Vendors for that city are signed out on their phones until they enter the
          new PIN.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.lg }} />
        ) : (
          <View style={styles.list}>
            {rows.map((row) => (
              <PinSummaryRow key={row.slug} row={row} onEdit={() => openPinModal(row.slug)} />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={pinModalSlug !== null && !!pinModalRow}
        transparent
        animationType="fade"
        onRequestClose={closePinModal}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={keyboardOffset}
        >
          <Pressable style={styles.modalBackdrop} onPress={closePinModal} accessibilityRole="button" />
          <View style={[styles.modalSheet, { marginTop: Math.max(insets.top, 12) + windowHeight * 0.06 }]}>
            <Text style={styles.modalTitle}>New PIN · {pinModalRow?.name}</Text>
            <Text style={styles.modalHint}>4–12 digits. Must be unique across all cities.</Text>
            <TextInput
              value={pinModalValue}
              onChangeText={(v) => setPinModalValue(v.replace(/\D/g, "").slice(0, 12))}
              placeholder="Enter new PIN"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={12}
              style={styles.modalInput}
              editable={savingSlug !== pinModalSlug}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalCancel, pressed && styles.modalBtnPress]}
                onPress={closePinModal}
                disabled={savingSlug === pinModalSlug}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalSave, pressed && styles.modalBtnPress]}
                onPress={saveFromModal}
                disabled={savingSlug === pinModalSlug || pinModalValue.trim().length < 4}
              >
                <Text style={styles.modalSaveText}>{savingSlug === pinModalSlug ? "Saving…" : "Save"}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );

  if (!isAdmin) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={keyboardOffset}
      >
        <ScrollView
          style={styles.root}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Pressable style={styles.backRow} onPress={() => router.replace("/admin/location")}>
            <MaterialIcons name="arrow-back" size={18} color={colors.primary} />
            <Text style={styles.backText}>Choose city</Text>
          </Pressable>
          <Text style={styles.title}>Vendor portal PINs</Text>
          <Text style={styles.subtitle}>
            Pick the admin city you are using for this session. After that you can view and change vendor PINs for all
            locations.
          </Text>
          <View style={styles.grid}>
            {CITIES.map((city) => {
              const busy = busyAuthSlug === city.slug;
              return (
                <Pressable
                  key={city.slug}
                  style={({ pressed }) => [styles.authCard, pressed && styles.authCardPress]}
                  onPress={() => void authorizeAsAdmin(city)}
                  disabled={!!busyAuthSlug}
                >
                  <MaterialIcons name="location-city" size={24} color={colors.primary} />
                  <Text style={styles.authCardTitle}>{city.name}</Text>
                  {busy ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardOffset}
    >
      {managePinsBody}
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
    paddingBottom: 120
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
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg
  },
  grid: {
    gap: spacing.md
  },
  authCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center"
  },
  authCardPress: {
    opacity: 0.92
  },
  authCardTitle: {
    marginTop: spacing.sm,
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary
  },
  list: {
    gap: spacing.md
  },
  pinCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md
  },
  pinCity: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary
  },
  pinSlug: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs
  },
  pinMasked: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    letterSpacing: 2,
    fontVariant: ["tabular-nums"] as const
  },
  openModalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 10
  },
  openModalBtnPress: {
    opacity: 0.9
  },
  openModalBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-start"
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.55)"
  },
  modalSheet: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    maxWidth: 420,
    alignSelf: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  modalHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 20,
    letterSpacing: 4,
    color: colors.textPrimary,
    marginBottom: spacing.md
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm
  },
  modalCancel: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 10
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textSecondary
  },
  modalSave: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primary
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff"
  },
  modalBtnPress: {
    opacity: 0.88
  }
});
