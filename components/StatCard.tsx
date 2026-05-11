import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, spacing } from "@/constants/theme";

type StatCardProps = {
  label: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
};

const StatCardInner: React.FC<StatCardProps> = ({ label, value, icon }) => {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <MaterialIcons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
};

export const StatCard = React.memo(StatCardInner);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 155,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EAF1FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary
  }
});
