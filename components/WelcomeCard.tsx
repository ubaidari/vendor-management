import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/constants/theme";

type WelcomeCardProps = {
  title: string;
  subtitle: string;
};

export const WelcomeCard: React.FC<WelcomeCardProps> = ({ title, subtitle }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22
  }
});
