import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, spacing } from "@/constants/theme";
import { CITIES, type CityDefinition } from "@/constants/locations";
import { useTaskStore } from "@/hooks/useTaskStore";
import { locationSession } from "@/services/locationSession";

export default function AdminLocationScreen() {
  const { refresh } = useTaskStore();
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const pickCity = async (city: CityDefinition): Promise<void> => {
    setBusySlug(city.slug);
    try {
      await locationSession.persist("admin", city.slug, city.name);
      await refresh();
      router.replace("/admin/dashboard");
    } finally {
      setBusySlug(null);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Pressable style={styles.backRow} onPress={() => router.replace("/")}>
        <MaterialIcons name="arrow-back" size={18} color={colors.primary} />
        <Text style={styles.backText}>Portals</Text>
      </Pressable>

      <Text style={styles.title}>Choose city</Text>

      <Pressable
        style={({ pressed }) => [styles.managePinsCard, pressed && styles.cardPressed]}
        onPress={() => router.push("/admin/vendor-pins")}
      >
        <View style={styles.managePinsIcon}>
          <MaterialIcons name="vpn-key" size={22} color="#7C3AED" />
        </View>
        <View style={styles.managePinsTextWrap}>
          <Text style={styles.managePinsTitle}>Vendor portal PINs</Text>
          <Text style={styles.managePinsSubtitle}>View or change vendor sign-in PIN for Karachi, Lahore, Islamabad.</Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={colors.textSecondary} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.devicePwCard, pressed && styles.cardPressed]}
        onPress={() => router.push("/admin/device-password")}
      >
        <View style={styles.devicePwIcon}>
          <MaterialIcons name="admin-panel-settings" size={22} color="#0F766E" />
        </View>
        <View style={styles.managePinsTextWrap}>
          <Text style={styles.devicePwTitle}>Admin portal device password</Text>
          <Text style={styles.devicePwSubtitle}>
            Change the password required to open the admin area on this device (not the vendor city PINs).
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={colors.textSecondary} />
      </Pressable>

      <View style={styles.grid}>
        {CITIES.map((city) => {
          const busy = busySlug === city.slug;
          return (
            <Pressable
              key={city.slug}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => void pickCity(city)}
              disabled={!!busySlug}
            >
              <View style={styles.iconCircle}>
                <MaterialIcons name="location-city" size={26} color={colors.primary} />
              </View>
              <Text style={styles.cardTitle}>{city.name}</Text>
              {busy ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.loadingText}>Opening…</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: spacing.md
  },
  backText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 14
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.md
  },
  managePinsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "#F5F3FF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    padding: spacing.md,
    marginBottom: spacing.lg
  },
  managePinsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center"
  },
  managePinsTextWrap: {
    flex: 1
  },
  managePinsTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#4C1D95"
  },
  managePinsSubtitle: {
    fontSize: 13,
    color: "#5B21B6",
    marginTop: 2,
    lineHeight: 18
  },
  devicePwCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "#F0FDFA",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#99F6E4",
    padding: spacing.md,
    marginBottom: spacing.lg
  },
  devicePwIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#CCFBF1",
    alignItems: "center",
    justifyContent: "center"
  },
  devicePwTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#134E4A"
  },
  devicePwSubtitle: {
    fontSize: 13,
    color: "#115E59",
    marginTop: 2,
    lineHeight: 18
  },
  grid: {
    gap: spacing.md
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }]
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EAF1FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600"
  }
});
