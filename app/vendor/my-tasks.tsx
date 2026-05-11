import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, spacing } from "@/constants/theme";
import { useTaskStore } from "@/hooks/useTaskStore";
import { apiClient } from "@/services/apiClient";
import { locationSession } from "@/services/locationSession";
import { TaskCard } from "@/components/TaskCard";
import { BRANCHES_BY_SLUG, getVendorNameForCitySlug } from "@/constants/locationCatalog";
import { getSessionCityDisplayLabel, type CitySlug } from "@/constants/locations";

const VendorMyTasksScreen: React.FC = () => {
  const { tasks, branches, isLoading, refresh } = useTaskStore();
  const [refreshing, setRefreshing] = useState(false);
  const sessionSlug = apiClient.getSessionSlug();
  const cityName = apiClient.getSessionLocationName();
  const locationLabel = getSessionCityDisplayLabel(sessionSlug, cityName);
  const vendorName = getVendorNameForCitySlug(sessionSlug);

  /** Same branch list as admin for this city — Lahore L1, Islamabad C4, Karachi five. */
  const branchOptions = useMemo(() => {
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

  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [isBranchOpen, setIsBranchOpen] = useState(false);

  const soleBranch = branchOptions.length === 1 ? branchOptions[0] : null;

  useEffect(() => {
    if (branchOptions.length === 1) {
      setSelectedBranch(branchOptions[0]);
      return;
    }
    setSelectedBranch((prev) => {
      if (prev !== "all" && !branchOptions.includes(prev)) {
        return "all";
      }
      return prev;
    });
  }, [branchOptions]);

  useEffect(() => {
    if (soleBranch !== null) {
      setIsBranchOpen(false);
    }
  }, [soleBranch]);

  const myTasks = useMemo(() => {
    if (!vendorName) {
      return [];
    }
    return tasks.filter((task) => task.vendor === vendorName);
  }, [tasks, vendorName]);

  const filteredTasks = useMemo(() => {
    if (soleBranch !== null) {
      return myTasks.filter((task) => task.branch === soleBranch);
    }
    return myTasks.filter((task) => selectedBranch === "all" || task.branch === selectedBranch);
  }, [myTasks, selectedBranch, soleBranch]);

  const branchLabel =
    soleBranch !== null ? soleBranch : selectedBranch === "all" ? "All Branches" : selectedBranch;

  const onPullRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

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
      <Text style={styles.heading}>My Tasks</Text>
      <Text style={styles.subheading}>
        Vendor for this city: {vendorName ?? "— (pick a city first)"}
      </Text>
      {cityName ? (
        <View style={styles.cityBadge}>
          <MaterialIcons name="place" size={16} color="#166534" />
          <Text style={styles.cityBadgeText}>{cityName}</Text>
        </View>
      ) : null}
      {isLoading && <Text style={styles.loadingText}>Loading assigned tasks...</Text>}
      {!isLoading && branchOptions.length === 0 && sessionSlug ? (
        <Text style={styles.warnText}>
          No branches loaded for this city. Confirm the API and seed, then pull to refresh or try again.
        </Text>
      ) : null}
      <View style={styles.topActions}>
        <Pressable
          style={styles.logoutButton}
          onPress={async () => {
            await locationSession.clear();
            router.replace("/");
          }}
        >
          <MaterialIcons name="logout" size={16} color="#991B1B" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.filterWrap}>
        <Text style={styles.filterLabel}>Branch filter — {locationLabel}</Text>
        <Pressable
          style={[styles.dropdownTrigger, soleBranch !== null && styles.dropdownTriggerDisabled]}
          onPress={() => soleBranch === null && setIsBranchOpen((prev) => !prev)}
          disabled={soleBranch !== null}
        >
          <Text style={styles.dropdownText}>{branchLabel}</Text>
          {soleBranch === null ? (
            <MaterialIcons
              name={isBranchOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={20}
              color={colors.textSecondary}
            />
          ) : null}
        </Pressable>
        {isBranchOpen && soleBranch === null && (
          <View style={styles.dropdownMenu}>
            <Pressable
              style={styles.dropdownItem}
              onPress={() => {
                setSelectedBranch("all");
                setIsBranchOpen(false);
              }}
            >
              <Text style={styles.dropdownItemText}>All Branches</Text>
            </Pressable>
            {branchOptions.map((branch) => (
              <Pressable
                key={branch}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedBranch(branch);
                  setIsBranchOpen(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{branch}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Text style={styles.resultsText}>{filteredTasks.length} task(s) assigned</Text>

      <View style={styles.listWrap}>
        {filteredTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            showVendor={false}
            onPress={() =>
              router.push({
                pathname: "/vendor/task-detail",
                params: { taskId: task.id }
              })
            }
          />
        ))}

        {filteredTasks.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No assigned tasks found for this branch.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default VendorMyTasksScreen;

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
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  subheading: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.xs
  },
  warnText: {
    fontSize: 13,
    color: "#B45309",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.sm
  },
  cityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md
  },
  cityBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534"
  },
  topActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.sm
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  logoutButtonText: {
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "700"
  },
  filterWrap: {
    marginBottom: spacing.sm
  },
  filterLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs
  },
  dropdownTrigger: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  dropdownTriggerDisabled: {
    opacity: 0.92
  },
  dropdownText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600"
  },
  dropdownMenu: {
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: "hidden"
  },
  dropdownItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  dropdownItemText: {
    color: colors.textPrimary,
    fontSize: 13
  },
  resultsText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm
  },
  listWrap: {
    gap: spacing.sm
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md
  },
  emptyStateText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center"
  }
});
