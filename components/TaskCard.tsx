import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Task } from "@/data/tasks";
import { colors, spacing } from "@/constants/theme";

type TaskCardProps = {
  task: Task;
  onPress?: () => void;
  showVendor?: boolean;
};

const getTaskTotalCost = (task: Task): number => {
  return task.labourCost + task.installationCost + task.repairCost + task.extraCost;
};

const formatCurrency = (amount: number): string => {
  return `PKR ${amount.toLocaleString()}`;
};

const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString();
};

const getStatusStyles = (status: Task["status"]) => {
  if (status === "completed") {
    return {
      backgroundColor: "#E8F7EE",
      textColor: "#166534",
      label: "Completed"
    };
  }

  if (status === "in-progress") {
    return {
      backgroundColor: "#E8F0FF",
      textColor: "#1E40AF",
      label: "In Progress"
    };
  }

  if (status === "on-hold") {
    return {
      backgroundColor: "#FFF7E6",
      textColor: "#92400E",
      label: "On Hold"
    };
  }

  return {
    backgroundColor: "#FEF3E8",
    textColor: "#9A3412",
    label: "Pending"
  };
};

const TaskCardInner: React.FC<TaskCardProps> = ({ task, onPress, showVendor = true }) => {
  const status = getStatusStyles(task.status);
  const content = (
    <>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{task.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: status.backgroundColor }]}>
          <Text style={[styles.statusText, { color: status.textColor }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Branch</Text>
        <Text style={styles.metaValue}>{task.branch}</Text>
      </View>
      {task.description ? (
        <View style={[styles.metaRow, styles.descriptionRow]}>
          <Text style={styles.metaLabel}>Description</Text>
          <Text style={[styles.metaValue, styles.descriptionValue]} numberOfLines={2}>
            {task.description}
          </Text>
        </View>
      ) : null}
      {showVendor && (
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Vendor</Text>
          <Text style={styles.metaValue}>{task.vendor}</Text>
        </View>
      )}
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Total Cost</Text>
        <Text style={styles.costValue}>{formatCurrency(getTaskTotalCost(task))}</Text>
      </View>
      {task.extraReason && task.extraReason !== "N/A" ? (
        <View style={[styles.metaRow, styles.descriptionRow]}>
          <Text style={styles.metaLabel}>Extra Cost Reason</Text>
          <Text style={[styles.metaValue, styles.descriptionValue]} numberOfLines={2}>
            {task.extraReason}
          </Text>
        </View>
      ) : null}
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Assigned On</Text>
        <Text style={styles.metaValue}>{formatDateTime(task.createdAt)}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Completed On</Text>
        <Text style={styles.metaValue}>{formatDateTime(task.completedAt)}</Text>
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ hovered, pressed }) => [
          styles.card,
          hovered && styles.cardHover,
          pressed && styles.cardPressed
        ]}
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.card}>{content}</View>;
};

export const TaskCard = React.memo(TaskCardInner);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.sm
  },
  cardHover: {
    borderColor: "#B9C9F3",
    backgroundColor: "#F3F7FF"
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }]
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700"
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md
  },
  descriptionRow: {
    alignItems: "flex-start"
  },
  metaLabel: {
    fontSize: 13,
    color: colors.textSecondary
  },
  metaValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: "600"
  },
  descriptionValue: {
    textAlign: "left",
    fontWeight: "500"
  },
  costValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary
  }
});
