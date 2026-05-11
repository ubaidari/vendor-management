import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { WelcomeCard } from "@/components/WelcomeCard";
import { colors, spacing } from "@/constants/theme";

const SignInScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <MaterialIcons name="storefront" size={24} color={colors.primary} />
      </View>
      <Text style={styles.header}>Vendor Management</Text>
      <WelcomeCard
        title="Welcome"
        subtitle="Expo Router with TypeScript is configured. This starter is prepared for Admin and Vendor role-based portals."
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: "center",
    backgroundColor: colors.background
  },
  iconWrap: {
    alignItems: "center",
    marginBottom: spacing.sm
  },
  header: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: "center"
  }
});

export default SignInScreen;
