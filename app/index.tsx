import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Redirect, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { AdminUnlockGate } from "@/components/AdminUnlockGate";
import { colors, spacing } from "@/constants/theme";
import { adminGate } from "@/services/adminGate";
import { appRoleMode, type AppUsageMode } from "@/services/appRoleMode";

/** Valid PNG (see assets/images); avoids AAPT2 compile failure from legacy mislabeled file */
const kickstartLogo = require("../assets/images/app-splash.png");

/** First launch (or reset): how will this device be used? */
const UsageChoiceScreen: React.FC<{
  onSelectAdmin: () => void;
  onSelectVendor: () => void;
}> = ({ onSelectAdmin, onSelectVendor }) => {
  return (
    <ScrollView
      style={styles.scrollRoot}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={styles.logoSection}>
        <View style={styles.logo3dOuter}>
          <View style={styles.logo3dInner}>
            <Image
              source={kickstartLogo}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="Kickstart co-working space logo"
            />
          </View>
        </View>
      </View>

      <View style={styles.headerWrap}>
        <Text style={styles.hubBrand}>Kickstart Vendor Hub</Text>
        <Text style={styles.welcomeKicker}>Welcome</Text>
        <Text style={styles.title}>How will you use this app?</Text>
        <Text style={styles.subtitle}>
          Choose the option that matches this device. Field vendor installs only see the vendor portal.
        </Text>
      </View>

      <Pressable
        style={({ hovered, pressed }) => [
          styles.usageCard,
          styles.usageCardAdmin,
          hovered && styles.usageCardAdminHover,
          pressed && styles.cardPressed
        ]}
        onPress={onSelectAdmin}
      >
        <View style={[styles.usageIconWrap, styles.usageIconWrapAdmin]}>
          <MaterialIcons name="admin-panel-settings" size={28} color="#1E3A8A" />
        </View>
        <View style={styles.cardTextWrap}>
          <Text style={styles.usageCardTitle}>Admin & operations</Text>
          <Text style={styles.usageCardBody}>
            City dashboards, tasks, branches, reports, and vendor PIN settings — full back-office access.
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#1E3A8A" />
      </Pressable>

      <Pressable
        style={({ hovered, pressed }) => [
          styles.usageCard,
          styles.usageCardVendor,
          hovered && styles.usageCardVendorHover,
          pressed && styles.cardPressed
        ]}
        onPress={onSelectVendor}
      >
        <View style={[styles.usageIconWrap, styles.usageIconWrapVendor]}>
          <MaterialIcons name="storefront" size={28} color="#14532D" />
        </View>
        <View style={styles.cardTextWrap}>
          <Text style={styles.usageCardTitle}>Field vendor</Text>
          <Text style={styles.usageCardBody}>
            Sign in with your city PIN and work on assigned tasks only — no admin screens on this device.
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#14532D" />
      </Pressable>

      <Text style={styles.footerNote}>Your choice is saved on this phone only.</Text>
    </ScrollView>
  );
};

/** Returning admin (or after first-time admin choice): pick Admin or Vendor portal. */
const PortalSelectionScreen: React.FC<{
  onOpenAdminPortal: () => void;
  onDevResetUsageChoice?: () => void;
}> = ({ onOpenAdminPortal, onDevResetUsageChoice }) => {
  return (
    <ScrollView
      style={styles.scrollRoot}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={styles.logoSection}>
        <View style={styles.logo3dOuter}>
          <View style={styles.logo3dInner}>
            <Image
              source={kickstartLogo}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="Kickstart co-working space logo"
            />
          </View>
        </View>
      </View>

      <View style={styles.headerWrap}>
        <Text style={styles.hubBrand}>Kickstart Vendor Hub</Text>
        <Text style={styles.title}>Select portal</Text>
        <Text style={styles.subtitle}>Choose the workspace you want to open.</Text>
      </View>

      <Pressable
        style={({ hovered, pressed }) => [
          styles.cardButton,
          hovered && styles.cardButtonHover,
          pressed && styles.cardPressed
        ]}
        onPress={onOpenAdminPortal}
      >
        <View style={styles.cardIconWrap}>
          <MaterialIcons name="admin-panel-settings" size={28} color={colors.primary} />
        </View>
        <View style={styles.cardTextWrap}>
          <Text style={styles.cardTitle}>Admin portal</Text>
          <Text style={styles.cardSubtitle}>Manage vendors, tasks, and operations by city.</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
      </Pressable>

      <Pressable
        style={({ hovered, pressed }) => [
          styles.cardButton,
          hovered && styles.cardButtonHover,
          pressed && styles.cardPressed
        ]}
        onPress={() => router.push("/vendor")}
      >
        <View style={styles.cardIconWrap}>
          <MaterialIcons name="storefront" size={28} color={colors.primary} />
        </View>
        <View style={styles.cardTextWrap}>
          <Text style={styles.cardTitle}>Vendor portal</Text>
          <Text style={styles.cardSubtitle}>Track assigned work and update task progress.</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
      </Pressable>

      {__DEV__ && onDevResetUsageChoice ? (
        <Pressable
          style={({ hovered, pressed }) => [
            styles.devResetRow,
            hovered && styles.devResetRowHover,
            pressed && styles.cardPressed
          ]}
          onPress={onDevResetUsageChoice}
        >
          <Text style={styles.devResetText}>Reset first-run choice (dev only)</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
};

export default function HomeScreen(): React.JSX.Element {
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<AppUsageMode | null>(null);
  const [adminUnlockVisible, setAdminUnlockVisible] = useState(false);
  const pendingUnlockRef = useRef<"usage" | "portal" | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const next = await appRoleMode.get();
      if (!alive) {
        return;
      }
      setMode(next);
      setHydrated(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const selectAdminUsage = (): void => {
    void (async () => {
      if (await adminGate.isVerified()) {
        await appRoleMode.set("admin");
        setMode("admin");
        return;
      }
      pendingUnlockRef.current = "usage";
      setAdminUnlockVisible(true);
    })();
  };

  const selectVendorUsage = (): void => {
    void (async () => {
      await appRoleMode.set("vendor");
      router.replace("/vendor");
    })();
  };

  const devResetUsageChoice = (): void => {
    void (async () => {
      await adminGate.clear();
      await appRoleMode.clear();
      setMode(null);
    })();
  };

  const openAdminPortal = (): void => {
    void (async () => {
      if (await adminGate.isVerified()) {
        router.push("/admin/location");
        return;
      }
      pendingUnlockRef.current = "portal";
      setAdminUnlockVisible(true);
    })();
  };

  const onAdminUnlockFromHome = (): void => {
    setAdminUnlockVisible(false);
    const pending = pendingUnlockRef.current;
    pendingUnlockRef.current = null;
    if (pending === "usage") {
      void (async () => {
        await appRoleMode.set("admin");
        setMode("admin");
      })();
    } else if (pending === "portal") {
      router.push("/admin/location");
    }
  };

  const dismissAdminUnlock = (): void => {
    setAdminUnlockVisible(false);
    pendingUnlockRef.current = null;
  };

  let body: React.ReactNode;
  if (!hydrated) {
    body = (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  } else if (mode === "vendor") {
    body = <Redirect href="/vendor" />;
  } else if (mode === null) {
    body = <UsageChoiceScreen onSelectAdmin={selectAdminUsage} onSelectVendor={selectVendorUsage} />;
  } else {
    body = (
      <PortalSelectionScreen
        onOpenAdminPortal={openAdminPortal}
        onDevResetUsageChoice={__DEV__ ? devResetUsageChoice : undefined}
      />
    );
  }

  return (
    <>
      {body}
      <Modal visible={adminUnlockVisible} animationType="fade" presentationStyle="pageSheet">
        <AdminUnlockGate onUnlocked={onAdminUnlockFromHome} onCancel={dismissAdminUnlock} />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center"
  },
  scrollRoot: {
    flex: 1,
    backgroundColor: colors.background
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md
  },
  logoSection: {
    alignItems: "center",
    marginBottom: spacing.sm
  },
  logo3dOuter: {
    borderRadius: 20,
    padding: 4,
    backgroundColor: "rgba(15, 23, 42, 0.12)",
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.35,
        shadowRadius: 18
      },
      android: {
        elevation: 18
      },
      default: {}
    })
  },
  logo3dInner: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#000000",
    transform: [{ perspective: 900 }, { rotateX: "6deg" }, { scale: 1.02 }],
    ...Platform.select({
      ios: {
        shadowColor: "#FACC15",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 14
      },
      android: {
        elevation: 10
      },
      default: {}
    })
  },
  logoImage: {
    width: 200,
    height: 140,
    alignSelf: "center"
  },
  headerWrap: {
    marginBottom: spacing.md,
    alignItems: "center"
  },
  hubBrand: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.sm,
    letterSpacing: -0.3
  },
  welcomeKicker: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: spacing.xs
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: "center"
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 380,
    lineHeight: 22
  },
  usageCard: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  usageCardAdmin: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE"
  },
  usageCardAdminHover: {
    backgroundColor: "#DBEAFE",
    borderColor: "#93C5FD"
  },
  usageCardVendor: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0"
  },
  usageCardVendorHover: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC"
  },
  usageIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  usageIconWrapAdmin: {
    backgroundColor: "#DBEAFE"
  },
  usageIconWrapVendor: {
    backgroundColor: "#DCFCE7"
  },
  usageCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4
  },
  usageCardBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20
  },
  footerNote: {
    marginTop: spacing.md,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 360,
    alignSelf: "center"
  },
  cardButton: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  cardButtonHover: {
    borderColor: "#B9C9F3",
    backgroundColor: "#F3F7FF"
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }]
  },
  cardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#EAF1FF",
    alignItems: "center",
    justifyContent: "center"
  },
  cardTextWrap: {
    flex: 1
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary
  },
  devResetRow: {
    alignSelf: "center",
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md
  },
  devResetRowHover: {
    opacity: 0.85
  },
  devResetText: {
    fontSize: 13,
    color: colors.textSecondary,
    textDecorationLine: "underline",
    textAlign: "center"
  }
});
