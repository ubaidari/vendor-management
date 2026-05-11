import React, { useMemo } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, spacing } from "@/constants/theme";
import { useTaskStore } from "@/hooks/useTaskStore";

const getTaskTotal = (task: ReturnType<typeof useTaskStore>["tasks"][number]): number => {
  return task.labourCost + task.installationCost + task.repairCost + task.extraCost;
};

const AdminReportsScreen: React.FC = () => {
  const { tasks } = useTaskStore();

  const summary = useMemo(() => {
    const totalMaintenanceCost = tasks.reduce((sum, task) => sum + getTaskTotal(task), 0);

    const branchCostMap = tasks.reduce<Record<string, number>>((acc, task) => {
      acc[task.branch] = (acc[task.branch] ?? 0) + getTaskTotal(task);
      return acc;
    }, {});

    const vendorActivityMap = tasks.reduce<Record<string, number>>((acc, task) => {
      acc[task.vendor] = (acc[task.vendor] ?? 0) + 1;
      return acc;
    }, {});

    const highestSpendingBranch =
      Object.entries(branchCostMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
    const mostActiveVendor =
      Object.entries(vendorActivityMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

    return {
      highestSpendingBranch,
      mostActiveVendor,
      totalMaintenanceCost
    };
  }, [tasks]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Reports Dashboard</Text>
      <Text style={styles.subheading}>Executive reporting view for maintenance operations.</Text>

      <View style={styles.chartCard}>
        <View style={styles.chartHeaderRow}>
          <Text style={styles.chartTitle}>Monthly Cost Trend</Text>
          <MaterialIcons name="show-chart" size={18} color={colors.textSecondary} />
        </View>
        <View style={styles.trendBarsWrap}>
          {[35, 55, 45, 72, 65, 80].map((height, index) => (
            <View key={`trend-${index}`} style={[styles.trendBar, { height }]} />
          ))}
        </View>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHeaderRow}>
          <Text style={styles.chartTitle}>Branch Cost Distribution</Text>
          <MaterialIcons name="donut-large" size={18} color={colors.textSecondary} />
        </View>
        <View style={styles.distributionRow}>
          <View style={[styles.distributionBlock, { flex: 4, backgroundColor: "#1E3A8A" }]} />
          <View style={[styles.distributionBlock, { flex: 3, backgroundColor: "#3B82F6" }]} />
          <View style={[styles.distributionBlock, { flex: 2, backgroundColor: "#60A5FA" }]} />
          <View style={[styles.distributionBlock, { flex: 2, backgroundColor: "#93C5FD" }]} />
          <View style={[styles.distributionBlock, { flex: 1, backgroundColor: "#BFDBFE" }]} />
        </View>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHeaderRow}>
          <Text style={styles.chartTitle}>Vendor Performance</Text>
          <MaterialIcons name="query-stats" size={18} color={colors.textSecondary} />
        </View>
        <View style={styles.vendorBarsWrap}>
          {[68, 88, 53, 77].map((width, index) => (
            <View key={`vendor-${index}`} style={styles.vendorBarRow}>
              <View style={styles.vendorBarTrack}>
                <View style={[styles.vendorBarFill, { width: `${width}%` }]} />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Highest spending branch</Text>
          <Text style={styles.summaryValue}>{summary.highestSpendingBranch}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Most active vendor</Text>
          <Text style={styles.summaryValue}>{summary.mostActiveVendor}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total maintenance cost</Text>
          <Text style={styles.costValue}>PKR {summary.totalMaintenanceCost.toLocaleString()}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default AdminReportsScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  subheading: {
    fontSize: 14,
    color: colors.textSecondary
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md
  },
  chartHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary
  },
  trendBarsWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    height: 90
  },
  trendBar: {
    flex: 1,
    backgroundColor: "#93C5FD",
    borderRadius: 8
  },
  distributionRow: {
    flexDirection: "row",
    height: 24,
    borderRadius: 999,
    overflow: "hidden"
  },
  distributionBlock: {
    height: "100%"
  },
  vendorBarsWrap: {
    gap: spacing.sm
  },
  vendorBarRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  vendorBarTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    overflow: "hidden"
  },
  vendorBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#2563EB"
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.md
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary
  },
  summaryValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: "600"
  },
  costValue: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "700"
  }
});
