import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { colors, spacing } from "@/constants/theme";

type NavLink = {
  href: string;
  label: string;
};

type PortalPlaceholderScreenProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
  links?: NavLink[];
};

export const PortalPlaceholderScreen: React.FC<PortalPlaceholderScreenProps> = ({
  icon,
  title,
  subtitle,
  links = []
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <MaterialIcons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {links.length > 0 && (
        <View style={styles.linksWrap}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} asChild>
              <Pressable style={styles.linkButton}>
                <Text style={styles.linkLabel}>{link.label}</Text>
                <MaterialIcons name="chevron-right" size={18} color={colors.textSecondary} />
              </Pressable>
            </Link>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: "#EAF1FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md
  },
  linksWrap: {
    width: "100%",
    maxWidth: 480,
    gap: spacing.sm
  },
  linkButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  linkLabel: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 14
  }
});
