import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/constants/theme";

const VendorHomeScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Vendor Portal Home (placeholder)</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: spacing.lg
  },
  text: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600"
  }
});

export default VendorHomeScreen;
