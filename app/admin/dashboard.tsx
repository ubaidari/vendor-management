import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, spacing } from "@/constants/theme";
import { StatCard } from "@/components/StatCard";
import { useTaskStore } from "@/hooks/useTaskStore";
import { BRANCHES_BY_SLUG } from "@/constants/locationCatalog";
import { getSessionCityDisplayLabel, type CitySlug } from "@/constants/locations";
import { apiClient } from "@/services/apiClient";
import { locationSession } from "@/services/locationSession";

const getTaskTotal = (
  task: ReturnType<typeof useTaskStore>["tasks"][number]
): number => {
  return task.labourCost + task.installationCost + task.repairCost + task.extraCost;
};

const formatCurrency = (amount: number): string => {
  return `PKR ${amount.toLocaleString()}`;
};

const getTaskDateKey = (value?: string): string | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTaskMonthKey = (value?: string): string | null => {
  const dateKey = getTaskDateKey(value);
  return dateKey ? dateKey.slice(0, 7) : null;
};

const formatMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split("-");
  const parsed = new Date(Number(year), Number(month) - 1, 1);
  return parsed.toLocaleString(undefined, { month: "long", year: "numeric" });
};

type BranchRange = "all" | "week" | "month" | "date";

const AdminDashboardScreen: React.FC = () => {
  const { created } = useLocalSearchParams<{ created?: string }>();
  const { tasks, metrics, branches, isLoading, refresh } = useTaskStore();
  const sessionSlug = apiClient.getSessionSlug();
  const locationLabel = getSessionCityDisplayLabel(sessionSlug, apiClient.getSessionLocationName());

  /** Branches allowed for the selected city (catalog ∩ API list). */
  const branchOptionsForOverview = useMemo(() => {
    if (!sessionSlug) {
      return [] as string[];
    }
    const key = sessionSlug.toLowerCase() as CitySlug;
    const allowed = BRANCHES_BY_SLUG[key];
    if (!allowed?.length) {
      return [];
    }
    return allowed.filter((name) => branches.includes(name));
  }, [branches, sessionSlug]);
  const [showSuccess, setShowSuccess] = useState(created === "1");
  const [branchRange, setBranchRange] = useState<BranchRange>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [openRangeFilter, setOpenRangeFilter] = useState<"range" | "month" | "date" | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const taskDerivedTotals = useMemo(
    () => ({
      total: tasks.length,
      completed: tasks.filter((task) => task.status === "completed").length,
      pending: tasks.filter((task) => task.status === "pending").length,
      onHold: tasks.filter((task) => task.status === "on-hold").length,
      totalCost: tasks.reduce((total, task) => total + getTaskTotal(task), 0)
    }),
    [tasks]
  );

  const totalTasks = metrics?.total ?? taskDerivedTotals.total;
  const completedTasks = metrics?.completed ?? taskDerivedTotals.completed;
  const pendingTasks = metrics?.pending ?? taskDerivedTotals.pending;
  const onHoldTasks = metrics?.onHold ?? taskDerivedTotals.onHold;
  const totalCost = metrics?.totalCost ?? taskDerivedTotals.totalCost;

  const monthOptions = useMemo(() => {
    const unique = Array.from(
      new Set(tasks.map((task) => getTaskMonthKey(task.createdAt)).filter((value): value is string => !!value))
    ).sort((a, b) => (a < b ? 1 : -1));
    return unique;
  }, [tasks]);

  const dateOptions = useMemo(() => {
    const source =
      branchRange === "month" && selectedMonth !== "all"
        ? tasks.filter((task) => getTaskMonthKey(task.createdAt) === selectedMonth)
        : tasks;
    const unique = Array.from(
      new Set(source.map((task) => getTaskDateKey(task.createdAt)).filter((value): value is string => !!value))
    ).sort((a, b) => (a < b ? 1 : -1));
    return unique;
  }, [tasks, branchRange, selectedMonth]);

  const filteredBranchTasks = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    return tasks.filter((task) => {
      const created = task.createdAt ? new Date(task.createdAt) : null;
      if (!created || Number.isNaN(created.getTime())) {
        return branchRange === "all";
      }
      if (branchRange === "week") {
        return created >= sevenDaysAgo && created <= now;
      }
      if (branchRange === "month") {
        if (selectedMonth === "all") {
          return true;
        }
        return getTaskMonthKey(task.createdAt) === selectedMonth;
      }
      if (branchRange === "date") {
        if (selectedDate === "all") {
          return true;
        }
        return getTaskDateKey(task.createdAt) === selectedDate;
      }
      return true;
    });
  }, [tasks, branchRange, selectedMonth, selectedDate]);

  const branchOverview = useMemo(() => {
    return branchOptionsForOverview.map((branchName) => {
      const branchTasks = filteredBranchTasks.filter((task) => task.branch === branchName);
      const branchTotalCost = branchTasks.reduce((total, task) => total + getTaskTotal(task), 0);
      return {
        branchName,
        taskCount: branchTasks.length,
        totalCost: branchTotalCost
      };
    });
  }, [branchOptionsForOverview, filteredBranchTasks]);

  useEffect(() => {
    if (created === "1") {
      setShowSuccess(true);
      const timeout = setTimeout(() => {
        setShowSuccess(false);
        router.replace("/admin/dashboard");
      }, 2200);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [created]);

  const rangeLabel =
    branchRange === "all"
      ? "All Time"
      : branchRange === "week"
        ? "Last 7 Days"
        : branchRange === "month"
          ? "Specific Month"
          : "Specific Date";
  const monthLabel =
    selectedMonth === "all"
      ? "All Months"
      : monthOptions.find((monthKey) => monthKey === selectedMonth)
        ? formatMonthLabel(selectedMonth)
        : "All Months";
  const dateLabel = selectedDate === "all" ? "All Dates" : selectedDate;

  const onPullRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const handleRangeSelect = (nextRange: BranchRange): void => {
    setBranchRange(nextRange);
    if (nextRange !== "month") {
      setSelectedMonth("all");
    }
    if (nextRange !== "date") {
      setSelectedDate("all");
    }
    setOpenRangeFilter(null);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onPullRefresh()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      keyboardDismissMode="on-drag"
    >
      <Text style={styles.heading}>Operations Overview</Text>
      {locationLabel !== "Choose a city" ? (
        <View style={styles.cityBadge}>
          <MaterialIcons name="place" size={16} color={colors.primary} />
          <Text style={styles.cityBadgeText}>{locationLabel}</Text>
        </View>
      ) : null}
      {showSuccess && (
        <View style={styles.successBanner}>
          <View style={styles.successIconWrap}>
            <MaterialIcons name="check" size={16} color="#166534" />
          </View>
          <View style={styles.successTextWrap}>
            <Text style={styles.successTitle}>Task Assigned Successfully</Text>
            <Text style={styles.successSubtitle}>Transaction completed and saved to database.</Text>
          </View>
        </View>
      )}
      {isLoading && <Text style={styles.loadingText}>Loading dashboard metrics...</Text>}
      <View style={styles.actionRow}>
        <Pressable style={styles.createTaskButton} onPress={() => router.push("/admin/create-task")}>
          <Text style={styles.createTaskButtonText}>Create Task</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.push("/admin/tasks")}>
          <Text style={styles.secondaryButtonText}>Task Management</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={async () => {
            await locationSession.clear();
            await refresh();
            router.replace("/admin/location");
          }}
        >
          <Text style={styles.secondaryButtonText}>Switch city</Text>
        </Pressable>
        <Pressable
          style={styles.logoutButton}
          onPress={async () => {
            await locationSession.clear();
            router.replace("/");
          }}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Total Tasks" value={String(totalTasks)} icon="assignment" />
        <StatCard label="Completed Tasks" value={String(completedTasks)} icon="task-alt" />
        <StatCard label="Pending Tasks" value={String(pendingTasks)} icon="hourglass-empty" />
        <StatCard label="On Hold Tasks" value={String(onHoldTasks)} icon="pause-circle-filled" />
        <StatCard label="Total Cost (Initial to Current)" value={formatCurrency(totalCost)} icon="payments" />
      </View>

      <Text style={styles.sectionTitle}>Branch overview — {locationLabel}</Text>
      {!isLoading && branchOptionsForOverview.length === 0 && sessionSlug ? (
        <Text style={styles.branchOverviewEmpty}>
          No branches loaded for this city. Refresh or confirm you are signed into the correct city.
        </Text>
      ) : null}
      <View style={styles.rangeFilterRow}>
        <Pressable
          style={styles.rangeTrigger}
          onPress={() => setOpenRangeFilter((prev) => (prev === "range" ? null : "range"))}
        >
          <Text style={styles.rangeTriggerText}>{rangeLabel}</Text>
          <MaterialIcons
            name={openRangeFilter === "range" ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>
        {branchRange === "month" && (
          <Pressable
            style={styles.rangeTrigger}
            onPress={() => setOpenRangeFilter((prev) => (prev === "month" ? null : "month"))}
          >
            <Text style={styles.rangeTriggerText}>{monthLabel}</Text>
            <MaterialIcons
              name={openRangeFilter === "month" ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
        {branchRange === "date" && (
          <Pressable
            style={styles.rangeTrigger}
            onPress={() => setOpenRangeFilter((prev) => (prev === "date" ? null : "date"))}
          >
            <Text style={styles.rangeTriggerText}>{dateLabel}</Text>
            <MaterialIcons
              name={openRangeFilter === "date" ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
      </View>
      {branchOverview.map((item) => (
        <View key={item.branchName} style={styles.branchCard}>
          <Text style={styles.branchName}>{item.branchName}</Text>
          <View style={styles.branchMetaRow}>
            <Text style={styles.branchMeta}>Tasks: {item.taskCount}</Text>
            <Text style={styles.branchMeta}>Total Cost: {formatCurrency(item.totalCost)}</Text>
          </View>
        </View>
      ))}

      <Modal
        visible={openRangeFilter !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenRangeFilter(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOpenRangeFilter(null)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>
              {openRangeFilter === "range"
                ? "Select Date Range"
                : openRangeFilter === "month"
                  ? "Select Month"
                  : "Select Date"}
            </Text>

            {openRangeFilter === "range" && (
              <>
                <Pressable style={styles.modalItem} onPress={() => handleRangeSelect("all")}>
                  <Text style={styles.modalItemText}>All Time</Text>
                </Pressable>
                <Pressable style={styles.modalItem} onPress={() => handleRangeSelect("week")}>
                  <Text style={styles.modalItemText}>Last 7 Days</Text>
                </Pressable>
                <Pressable style={styles.modalItem} onPress={() => handleRangeSelect("month")}>
                  <Text style={styles.modalItemText}>Specific Month</Text>
                </Pressable>
                <Pressable style={styles.modalItem} onPress={() => handleRangeSelect("date")}>
                  <Text style={styles.modalItemText}>Specific Date</Text>
                </Pressable>
              </>
            )}

            {openRangeFilter === "month" && (
              <ScrollView style={styles.modalList}>
                <Pressable
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedMonth("all");
                    setOpenRangeFilter(null);
                  }}
                >
                  <Text style={styles.modalItemText}>All Months</Text>
                </Pressable>
                {monthOptions.map((monthKey) => (
                  <Pressable
                    key={monthKey}
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedMonth(monthKey);
                      setOpenRangeFilter(null);
                    }}
                  >
                    <Text style={styles.modalItemText}>{formatMonthLabel(monthKey)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {openRangeFilter === "date" && (
              <ScrollView style={styles.modalList}>
                <Pressable
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedDate("all");
                    setOpenRangeFilter(null);
                  }}
                >
                  <Text style={styles.modalItemText}>All Dates</Text>
                </Pressable>
                {dateOptions.map((dateKey) => (
                  <Pressable
                    key={dateKey}
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedDate(dateKey);
                      setOpenRangeFilter(null);
                    }}
                  >
                    <Text style={styles.modalItemText}>{dateKey}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
};

export default AdminDashboardScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl
  },
  heading: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  cityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#EAF1FF",
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md
  },
  cityBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary
  },
  loadingText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm
  },
  successBanner: {
    marginBottom: spacing.sm,
    backgroundColor: "#E8F7EE",
    borderWidth: 1,
    borderColor: "#BBE7CA",
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  successIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D1F2DD",
    alignItems: "center",
    justifyContent: "center"
  },
  successTextWrap: {
    flex: 1
  },
  successTitle: {
    color: "#166534",
    fontWeight: "700",
    fontSize: 13
  },
  successSubtitle: {
    color: "#166534",
    fontSize: 12
  },
  createTaskButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md
  },
  createTaskButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700"
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  secondaryButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  logoutButton: {
    alignSelf: "flex-start",
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md
  },
  logoutButtonText: {
    color: "#991B1B",
    fontSize: 14,
    fontWeight: "700"
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  branchOverviewEmpty: {
    fontSize: 13,
    color: "#B45309",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.sm
  },
  rangeFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  rangeTrigger: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 180,
    gap: spacing.xs
  },
  rangeTriggerText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600"
  },
  branchCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  branchName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  branchMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: spacing.xs,
    columnGap: spacing.md
  },
  branchMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600"
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    width: "100%",
    maxWidth: 480,
    maxHeight: "70%"
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  modalList: {
    maxHeight: 360
  },
  modalItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  modalItemText: {
    fontSize: 14,
    color: colors.textPrimary
  }
});
