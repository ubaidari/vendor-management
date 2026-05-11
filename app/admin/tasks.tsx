import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { TaskStatus } from "@/data/tasks";
import { colors, spacing } from "@/constants/theme";
import { TaskCard } from "@/components/TaskCard";
import { useTaskStore } from "@/hooks/useTaskStore";
import { ADMIN_TASK_CATEGORIES } from "@/constants/adminTaskCategories";
import { BRANCHES_BY_SLUG, VENDOR_NAME_BY_SLUG } from "@/constants/locationCatalog";
import { getSessionCityDisplayLabel, type CitySlug } from "@/constants/locations";
import { apiClient } from "@/services/apiClient";
import { downloadTaskInvoice } from "@/services/invoiceDownload";
import { cacheTaskInvoiceForPreview, removeInvoicePreviewCacheFile } from "@/services/invoicePreview";

type FilterValue = "all" | TaskStatus;
type MonthValue = "all" | string;
type DateValue = "all" | string;

const statusOptions: { label: string; value: FilterValue }[] = [
  { label: "All Status", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "In Progress", value: "in-progress" },
  { label: "On Hold", value: "on-hold" },
  { label: "Completed", value: "completed" }
];

const getTaskDateKey = (value?: string): string | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
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

const AdminTasksScreen: React.FC = () => {
  const { tasks, branches, vendors, isLoading, deleteTask, updateTask, refresh } = useTaskStore();
  const sessionSlug = apiClient.getSessionSlug();
  const locationLabel = getSessionCityDisplayLabel(sessionSlug, apiClient.getSessionLocationName());

  const branchOptionsForCity = useMemo(() => {
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

  const vendorOptionsForCity = useMemo(() => {
    if (!sessionSlug) {
      return [] as string[];
    }
    const key = sessionSlug.toLowerCase() as CitySlug;
    const expected = VENDOR_NAME_BY_SLUG[key];
    if (!expected) {
      return [];
    }
    return vendors.includes(expected) ? [expected] : [];
  }, [vendors, sessionSlug]);

  const soleBranchForCity = branchOptionsForCity.length === 1 ? branchOptionsForCity[0] : null;

  useEffect(() => {
    if (branchOptionsForCity.length === 1) {
      setSelectedBranch(branchOptionsForCity[0]);
      return;
    }
    setSelectedBranch((prev) => {
      if (prev !== "all" && !branchOptionsForCity.includes(prev)) {
        return "all";
      }
      return prev;
    });
  }, [branchOptionsForCity]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<FilterValue>("all");
  const [selectedMonth, setSelectedMonth] = useState<MonthValue>("all");
  const [selectedDate, setSelectedDate] = useState<DateValue>("all");
  const [openFilter, setOpenFilter] = useState<"branch" | "status" | "month" | "date" | null>(null);
  const [taskPendingDelete, setTaskPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const [taskPendingEdit, setTaskPendingEdit] = useState<{
    id: string;
    title: string;
    branch: string;
    category: string;
    vendor: string;
    description: string;
  } | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [invoicePreview, setInvoicePreview] = useState<{ taskId: string; taskTitle: string } | null>(null);
  const [invoicePreviewUri, setInvoicePreviewUri] = useState<string | null>(null);
  const [invoicePreviewLoading, setInvoicePreviewLoading] = useState(false);
  const [invoicePreviewError, setInvoicePreviewError] = useState<string | null>(null);
  const [listRefreshing, setListRefreshing] = useState(false);

  const onPullRefreshTasks = useCallback(async (): Promise<void> => {
    setListRefreshing(true);
    try {
      await refresh();
    } finally {
      setListRefreshing(false);
    }
  }, [refresh]);

  const invoicePreviewImageHeight = useMemo(
    () => Math.min(560, Math.floor(Dimensions.get("window").height * 0.62)),
    []
  );

  /** Include legacy branch/vendor from the task row so old DB rows stay editable until updated. */
  const editBranchOptions = useMemo(() => {
    const base = [...branchOptionsForCity];
    if (taskPendingEdit?.branch && !base.includes(taskPendingEdit.branch)) {
      return [...base, taskPendingEdit.branch];
    }
    return base;
  }, [branchOptionsForCity, taskPendingEdit?.branch]);

  const editVendorOptions = useMemo(() => {
    const base = [...vendorOptionsForCity];
    if (taskPendingEdit?.vendor && !base.includes(taskPendingEdit.vendor)) {
      return [...base, taskPendingEdit.vendor];
    }
    return base;
  }, [vendorOptionsForCity, taskPendingEdit?.vendor]);

  /** Installation and Repair only, plus legacy category on the row until admin picks a new one. */
  const editCategoryOptions = useMemo(() => {
    const base = [...ADMIN_TASK_CATEGORIES];
    const c = taskPendingEdit?.category?.trim();
    if (c && !(base as readonly string[]).includes(c)) {
      return [...base, c];
    }
    return base;
  }, [taskPendingEdit?.category]);

  const monthOptions = useMemo(() => {
    const unique = Array.from(
      new Set(tasks.map((task) => getTaskMonthKey(task.createdAt)).filter((value): value is string => !!value))
    ).sort((a, b) => (a < b ? 1 : -1));

    return unique.map((monthKey) => ({
      value: monthKey,
      label: formatMonthLabel(monthKey)
    }));
  }, [tasks]);

  const dateOptions = useMemo(() => {
    const sourceTasks =
      selectedMonth === "all"
        ? tasks
        : tasks.filter((task) => getTaskMonthKey(task.createdAt) === selectedMonth);

    const uniqueDates = Array.from(
      new Set(sourceTasks.map((task) => getTaskDateKey(task.createdAt)).filter((value): value is string => !!value))
    ).sort((a, b) => (a < b ? 1 : -1));

    return uniqueDates;
  }, [tasks, selectedMonth]);

  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        task.title.toLowerCase().includes(normalizedSearch) ||
        task.vendor.toLowerCase().includes(normalizedSearch);

      const matchesBranch =
        soleBranchForCity !== null
          ? task.branch === soleBranchForCity
          : selectedBranch === "all" || task.branch === selectedBranch;
      const matchesStatus = selectedStatus === "all" || task.status === selectedStatus;
      const taskMonth = getTaskMonthKey(task.createdAt);
      const taskDate = getTaskDateKey(task.createdAt);
      const matchesMonth = selectedMonth === "all" || taskMonth === selectedMonth;
      const matchesDate = selectedDate === "all" || taskDate === selectedDate;

      return matchesSearch && matchesBranch && matchesStatus && matchesMonth && matchesDate;
    });
  }, [searchQuery, selectedBranch, selectedStatus, selectedMonth, selectedDate, tasks, soleBranchForCity]);

  const branchLabel =
    soleBranchForCity !== null
      ? soleBranchForCity
      : selectedBranch === "all"
        ? "All Branches"
        : selectedBranch;
  const statusLabel =
    statusOptions.find((option) => option.value === selectedStatus)?.label ?? "All Status";
  const monthLabel =
    selectedMonth === "all"
      ? "All Months"
      : monthOptions.find((option) => option.value === selectedMonth)?.label ?? "All Months";
  const dateLabel = selectedDate === "all" ? "All Dates" : selectedDate;

  const activeOptions = useMemo(() => {
    if (openFilter === "branch") {
      return soleBranchForCity !== null ? [soleBranchForCity] : ["All Branches", ...branchOptionsForCity];
    }
    if (openFilter === "status") {
      return statusOptions.map((option) => option.label);
    }
    if (openFilter === "month") {
      return ["All Months", ...monthOptions.map((option) => option.label)];
    }
    if (openFilter === "date") {
      return ["All Dates", ...dateOptions];
    }
    return [];
  }, [openFilter, branchOptionsForCity, soleBranchForCity, monthOptions, dateOptions]);

  const handleOptionSelect = (label: string): void => {
    if (openFilter === "branch") {
      setSelectedBranch(label === "All Branches" ? "all" : label);
    }
    if (openFilter === "status") {
      const matched = statusOptions.find((option) => option.label === label);
      setSelectedStatus(matched?.value ?? "all");
    }
    if (openFilter === "month") {
      if (label === "All Months") {
        setSelectedMonth("all");
      } else {
        const matched = monthOptions.find((option) => option.label === label);
        setSelectedMonth(matched?.value ?? "all");
      }
      setSelectedDate("all");
    }
    if (openFilter === "date") {
      setSelectedDate(label === "All Dates" ? "all" : label);
    }
    setOpenFilter(null);
  };

  const handleDeleteTask = (taskId: string, taskTitle: string): void => {
    setTaskPendingDelete({ id: taskId, title: taskTitle });
  };

  const handleDownloadInvoice = async (taskId: string, fileLabel: string): Promise<void> => {
    try {
      await downloadTaskInvoice(taskId, fileLabel);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not download the invoice.";
      Alert.alert("Download failed", message);
    }
  };

  const openInvoicePreview = (taskId: string, taskTitle: string): void => {
    setInvoicePreview({ taskId, taskTitle });
  };

  const closeInvoicePreview = (): void => {
    if (invoicePreviewUri) {
      void removeInvoicePreviewCacheFile(invoicePreviewUri);
    }
    setInvoicePreview(null);
    setInvoicePreviewUri(null);
    setInvoicePreviewError(null);
    setInvoicePreviewLoading(false);
  };

  useEffect(() => {
    if (!invoicePreview) {
      return;
    }
    let alive = true;
    let downloadedUri: string | null = null;

    setInvoicePreviewLoading(true);
    setInvoicePreviewError(null);
    setInvoicePreviewUri(null);

    void (async () => {
      try {
        const uri = await cacheTaskInvoiceForPreview(invoicePreview.taskId);
        downloadedUri = uri;
        if (!alive) {
          await removeInvoicePreviewCacheFile(uri);
          return;
        }
        setInvoicePreviewUri(uri);
      } catch (e) {
        if (!alive) {
          return;
        }
        setInvoicePreviewError(e instanceof Error ? e.message : "Could not load invoice.");
      } finally {
        if (alive) {
          setInvoicePreviewLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
      if (downloadedUri) {
        void removeInvoicePreviewCacheFile(downloadedUri);
      }
    };
  }, [invoicePreview]);

  const confirmDeleteTask = async (): Promise<void> => {
    if (!taskPendingDelete) {
      return;
    }
    try {
      await deleteTask(taskPendingDelete.id);
      setTaskPendingDelete(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete task.";
      Alert.alert("Delete Failed", message);
    }
  };

  const handleEditTask = (taskId: string): void => {
    const selected = tasks.find((task) => task.id === taskId);
    if (!selected || selected.status === "completed") {
      return;
    }
    setTaskPendingEdit({
      id: selected.id,
      title: selected.title,
      branch: selected.branch,
      category: selected.category,
      vendor: selected.vendor,
      description: selected.description ?? ""
    });
  };

  const handleSaveEditedTask = async (): Promise<void> => {
    if (!taskPendingEdit) {
      return;
    }
    if (
      taskPendingEdit.title.trim().length === 0 ||
      taskPendingEdit.branch.trim().length === 0 ||
      taskPendingEdit.vendor.trim().length === 0
    ) {
      Alert.alert("Missing Fields", "Title, branch, and vendor are required.");
      return;
    }
    try {
      setIsSubmittingEdit(true);
      await updateTask({
        taskId: taskPendingEdit.id,
        title: taskPendingEdit.title,
        branch: taskPendingEdit.branch,
        category: taskPendingEdit.category,
        vendor: taskPendingEdit.vendor,
        description: taskPendingEdit.description
      });
      setTaskPendingEdit(null);
      Alert.alert("Updated", "Task updated successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update task.";
      Alert.alert("Update Failed", message);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={listRefreshing}
          onRefresh={() => void onPullRefreshTasks()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      keyboardDismissMode="on-drag"
    >
      <Text style={styles.heading}>Task Management</Text>
      <Text style={styles.subheading}>{locationLabel}</Text>
      {isLoading && <Text style={styles.loadingText}>Loading tasks...</Text>}

      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by task title or vendor"
          placeholderTextColor={colors.textSecondary}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filterRow}>
        <View style={styles.filterField}>
          <Pressable
            style={[styles.dropdownTrigger, soleBranchForCity !== null && styles.dropdownTriggerDisabled]}
            disabled={soleBranchForCity !== null}
            onPress={() =>
              soleBranchForCity === null && setOpenFilter((prev) => (prev === "branch" ? null : "branch"))
            }
          >
            <Text style={styles.dropdownText}>{branchLabel}</Text>
            {soleBranchForCity === null ? (
              <MaterialIcons
                name={openFilter === "branch" ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                size={20}
                color={colors.textSecondary}
              />
            ) : null}
          </Pressable>
        </View>

        <View style={styles.filterField}>
          <Pressable
            style={styles.dropdownTrigger}
            onPress={() => setOpenFilter((prev) => (prev === "status" ? null : "status"))}
          >
            <Text style={styles.dropdownText}>{statusLabel}</Text>
            <MaterialIcons
              name={openFilter === "status" ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>
      </View>
      <View style={styles.filterRow}>
        <View style={styles.filterField}>
          <Pressable
            style={styles.dropdownTrigger}
            onPress={() => setOpenFilter((prev) => (prev === "month" ? null : "month"))}
          >
            <Text style={styles.dropdownText}>{monthLabel}</Text>
            <MaterialIcons
              name={openFilter === "month" ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>

        <View style={styles.filterField}>
          <Pressable
            style={styles.dropdownTrigger}
            onPress={() => setOpenFilter((prev) => (prev === "date" ? null : "date"))}
          >
            <Text style={styles.dropdownText}>{dateLabel}</Text>
            <MaterialIcons
              name={openFilter === "date" ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>
      </View>

      <Text style={styles.resultsText}>{filteredTasks.length} task(s) found</Text>

      <View style={styles.listWrap}>
        {filteredTasks.map((task) => (
          <View key={task.id} style={styles.taskRow}>
            <TaskCard task={task} />
            <View style={styles.taskActionsRow}>
              {task.hasInvoice ? (
                <View style={styles.invoiceActionsGroup}>
                  <Pressable
                    style={({ hovered, pressed }) => [
                      styles.invoiceViewButton,
                      hovered && styles.invoiceViewButtonHover,
                      pressed && styles.actionButtonPressed
                    ]}
                    onPress={() => openInvoicePreview(task.id, task.title)}
                  >
                    <MaterialIcons name="visibility" size={16} color="#14532D" />
                    <Text style={styles.invoiceViewButtonText}>View</Text>
                  </Pressable>
                  <Pressable
                    style={({ hovered, pressed }) => [
                      styles.invoiceDownloadButton,
                      hovered && styles.invoiceDownloadButtonHover,
                      pressed && styles.actionButtonPressed
                    ]}
                    onPress={() => void handleDownloadInvoice(task.id, `invoice_${task.id}.jpg`)}
                  >
                    <MaterialIcons name="download" size={16} color="#1E3A5F" />
                    <Text style={styles.invoiceDownloadButtonText}>Download</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.invoiceMissing}>
                  <Text style={styles.invoiceMissingText}>No invoice</Text>
                </View>
              )}
              {task.status !== "completed" && (
                <Pressable
                  style={({ hovered, pressed }) => [
                    styles.editButton,
                    hovered && styles.editButtonHover,
                    pressed && styles.actionButtonPressed
                  ]}
                  onPress={() => handleEditTask(task.id)}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </Pressable>
              )}
              <Pressable
                style={({ hovered, pressed }) => [
                  styles.deleteButton,
                  hovered && styles.deleteButtonHover,
                  pressed && styles.actionButtonPressed
                ]}
                onPress={() => handleDeleteTask(task.id, task.title)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {filteredTasks.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No tasks match your current filters.</Text>
          </View>
        )}
      </View>

      <Modal visible={openFilter !== null} transparent animationType="fade" onRequestClose={() => setOpenFilter(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpenFilter(null)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>
              {openFilter === "branch"
                ? "Select Branch"
                : openFilter === "status"
                  ? "Select Status"
                  : openFilter === "month"
                    ? "Select Month"
                    : "Select Date"}
            </Text>
            <ScrollView style={styles.modalList}>
              {activeOptions.map((label) => (
                <Pressable
                  key={label}
                  style={({ hovered, pressed }) => [
                    styles.modalItem,
                    hovered && styles.modalItemHover,
                    pressed && styles.modalItemPressed
                  ]}
                  onPress={() => handleOptionSelect(label)}
                >
                  <Text style={styles.modalItemText}>{label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={invoicePreview !== null}
        transparent
        animationType="fade"
        onRequestClose={closeInvoicePreview}
      >
        <View style={styles.invoicePreviewBackdrop}>
          <View style={styles.invoicePreviewCard}>
            <View style={styles.invoicePreviewHeader}>
              <Text style={styles.invoicePreviewTitle} numberOfLines={2}>
                Invoice · {invoicePreview?.taskTitle ?? ""}
              </Text>
              <Pressable
                onPress={closeInvoicePreview}
                hitSlop={10}
                style={({ hovered, pressed }) => [
                  styles.invoicePreviewClose,
                  hovered && styles.invoicePreviewCloseHover,
                  pressed && styles.actionButtonPressed
                ]}
              >
                <MaterialIcons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>
            {invoicePreviewLoading ? (
              <View style={styles.invoicePreviewCenter}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.invoicePreviewMuted}>Loading invoice…</Text>
              </View>
            ) : invoicePreviewError ? (
              <View style={styles.invoicePreviewCenter}>
                <Text style={styles.invoicePreviewError}>{invoicePreviewError}</Text>
              </View>
            ) : invoicePreviewUri ? (
              <ScrollView
                style={styles.invoicePreviewScroll}
                contentContainerStyle={styles.invoicePreviewScrollContent}
                showsVerticalScrollIndicator
              >
                <Image
                  source={{ uri: invoicePreviewUri }}
                  style={[styles.invoicePreviewImage, { height: invoicePreviewImageHeight }]}
                  resizeMode="contain"
                />
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={taskPendingDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTaskPendingDelete(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setTaskPendingDelete(null)}>
          <Pressable style={styles.confirmCard} onPress={() => undefined}>
            <Text style={styles.confirmTitle}>Delete Task?</Text>
            <Text style={styles.confirmText}>
              Are you sure you want to delete "{taskPendingDelete?.title}"? This will remove it from Admin and Vendor portals.
            </Text>
            <View style={styles.confirmButtonRow}>
              <Pressable
                style={({ hovered, pressed }) => [
                  styles.confirmYesButton,
                  hovered && styles.confirmYesHover,
                  pressed && styles.confirmPressed
                ]}
                onPress={confirmDeleteTask}
              >
                <Text style={styles.confirmYesText}>Yes</Text>
              </Pressable>
              <Pressable
                style={({ hovered, pressed }) => [
                  styles.confirmNoButton,
                  hovered && styles.confirmNoHover,
                  pressed && styles.confirmPressed
                ]}
                onPress={() => setTaskPendingDelete(null)}
              >
                <Text style={styles.confirmNoText}>No</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={taskPendingEdit !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTaskPendingEdit(null)}
      >
        <KeyboardAvoidingView
          style={styles.editModalKeyboard}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setTaskPendingEdit(null)}>
            <Pressable style={styles.editCard} onPress={() => undefined}>
              <ScrollView
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.editModalScroll}
                contentContainerStyle={styles.editModalScrollContent}
              >
            <Text style={styles.confirmTitle}>Edit Task</Text>
            <Text style={styles.confirmText}>Update task details. Completed tasks cannot be edited.</Text>

            <Text style={styles.inputLabel}>Task Title</Text>
            <TextInput
              value={taskPendingEdit?.title ?? ""}
              onChangeText={(value) =>
                setTaskPendingEdit((current) => (current ? { ...current, title: value } : current))
              }
              style={styles.editInput}
              placeholder="Task title"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {editCategoryOptions.map((category) => {
                const selected = taskPendingEdit?.category === category;
                return (
                  <Pressable
                    key={category}
                    style={({ hovered, pressed }) => [
                      styles.choiceChip,
                      selected && styles.choiceChipSelected,
                      hovered && styles.choiceChipHover,
                      pressed && styles.choiceChipPressed
                    ]}
                    onPress={() =>
                      setTaskPendingEdit((current) => (current ? { ...current, category } : current))
                    }
                  >
                    <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              value={taskPendingEdit?.description ?? ""}
              onChangeText={(value) =>
                setTaskPendingEdit((current) => (current ? { ...current, description: value } : current))
              }
              style={[styles.editInput, styles.editTextArea]}
              placeholder="Description"
              placeholderTextColor={colors.textSecondary}
              multiline
            />

            <Text style={styles.inputLabel}>Branch — {locationLabel}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {editBranchOptions.map((branch) => {
                const selected = taskPendingEdit?.branch === branch;
                return (
                  <Pressable
                    key={branch}
                    style={({ hovered, pressed }) => [
                      styles.choiceChip,
                      selected && styles.choiceChipSelected,
                      hovered && styles.choiceChipHover,
                      pressed && styles.choiceChipPressed
                    ]}
                    onPress={() =>
                      setTaskPendingEdit((current) => (current ? { ...current, branch } : current))
                    }
                  >
                    <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
                      {branch}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.inputLabel}>Vendor — {locationLabel}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {editVendorOptions.map((vendor) => {
                const selected = taskPendingEdit?.vendor === vendor;
                return (
                  <Pressable
                    key={vendor}
                    style={({ hovered, pressed }) => [
                      styles.choiceChip,
                      selected && styles.choiceChipSelected,
                      hovered && styles.choiceChipHover,
                      pressed && styles.choiceChipPressed
                    ]}
                    onPress={() =>
                      setTaskPendingEdit((current) => (current ? { ...current, vendor } : current))
                    }
                  >
                    <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
                      {vendor}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.confirmButtonRow}>
              <Pressable
                style={({ hovered, pressed }) => [
                  styles.confirmYesButton,
                  hovered && styles.confirmYesHover,
                  pressed && styles.confirmPressed
                ]}
                onPress={handleSaveEditedTask}
                disabled={isSubmittingEdit}
              >
                <Text style={styles.confirmYesText}>{isSubmittingEdit ? "Saving..." : "Save"}</Text>
              </Pressable>
              <Pressable
                style={({ hovered, pressed }) => [
                  styles.confirmNoButton,
                  hovered && styles.confirmNoHover,
                  pressed && styles.confirmPressed
                ]}
                onPress={() => setTaskPendingEdit(null)}
                disabled={isSubmittingEdit}
              >
                <Text style={styles.confirmNoText}>Cancel</Text>
              </Pressable>
            </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
};

export default AdminTasksScreen;

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
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md
  },
  loadingText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm
  },
  searchWrap: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: spacing.sm
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  filterField: {
    flex: 1
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
  modalItemHover: {
    backgroundColor: "#F3F7FF"
  },
  modalItemPressed: {
    backgroundColor: "#E8F0FF"
  },
  modalItemText: {
    fontSize: 14,
    color: colors.textPrimary
  },
  resultsText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm
  },
  listWrap: {
    gap: spacing.sm
  },
  taskRow: {
    gap: spacing.xs
  },
  taskActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs
  },
  invoiceActionsGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs
  },
  invoiceViewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  invoiceViewButtonHover: {
    backgroundColor: "#BBF7D0",
    borderColor: "#4ADE80"
  },
  invoiceViewButtonText: {
    color: "#14532D",
    fontSize: 12,
    fontWeight: "700"
  },
  invoiceDownloadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E0F2FE",
    borderWidth: 1,
    borderColor: "#7DD3FC",
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  invoiceDownloadButtonHover: {
    backgroundColor: "#BAE6FD",
    borderColor: "#38BDF8"
  },
  invoiceDownloadButtonText: {
    color: "#1E3A5F",
    fontSize: 12,
    fontWeight: "700"
  },
  invoiceMissing: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  invoiceMissingText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600"
  },
  invoicePreviewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md
  },
  invoicePreviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    width: "100%",
    maxWidth: 720,
    maxHeight: "92%",
    overflow: "hidden"
  },
  invoicePreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  invoicePreviewTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary
  },
  invoicePreviewClose: {
    borderRadius: 8,
    padding: 4
  },
  invoicePreviewCloseHover: {
    backgroundColor: "#F1F5F9"
  },
  invoicePreviewScroll: {
    maxHeight: Dimensions.get("window").height * 0.75
  },
  invoicePreviewScrollContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm
  },
  invoicePreviewImage: {
    width: "100%"
  },
  invoicePreviewCenter: {
    minHeight: 200,
    padding: spacing.lg,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm
  },
  invoicePreviewMuted: {
    fontSize: 13,
    color: colors.textSecondary
  },
  invoicePreviewError: {
    fontSize: 14,
    color: "#B91C1C",
    textAlign: "center",
    fontWeight: "600"
  },
  editButton: {
    alignSelf: "flex-end",
    backgroundColor: "#DBEAFE",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  editButtonHover: {
    backgroundColor: "#BFDBFE",
    borderColor: "#93C5FD"
  },
  editButtonText: {
    color: "#1E3A8A",
    fontSize: 12,
    fontWeight: "700"
  },
  deleteButton: {
    alignSelf: "flex-end",
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  deleteButtonHover: {
    backgroundColor: "#FECACA",
    borderColor: "#FCA5A5"
  },
  deleteButtonPressed: {
    opacity: 0.88
  },
  actionButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }]
  },
  deleteButtonText: {
    color: "#991B1B",
    fontSize: 12,
    fontWeight: "700"
  },
  confirmCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    maxWidth: 520,
    width: "100%"
  },
  editModalKeyboard: {
    flex: 1
  },
  editCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    maxWidth: 640,
    width: "100%",
    maxHeight: "88%"
  },
  editModalScroll: {
    maxHeight: 440
  },
  editModalScrollContent: {
    paddingBottom: spacing.lg
  },
  inputLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: spacing.xs
  },
  editInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    backgroundColor: colors.background
  },
  editTextArea: {
    minHeight: 80,
    textAlignVertical: "top"
  },
  chipRow: {
    gap: spacing.xs,
    paddingVertical: 4
  },
  choiceChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    backgroundColor: colors.background
  },
  choiceChipSelected: {
    backgroundColor: "#E0EAFF",
    borderColor: "#9DBBFF"
  },
  choiceChipHover: {
    backgroundColor: "#F3F7FF"
  },
  choiceChipPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }]
  },
  choiceChipText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "600"
  },
  choiceChipTextSelected: {
    color: "#1E3A8A"
  },
  confirmTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: spacing.xs
  },
  confirmText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.md
  },
  confirmButtonRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  confirmYesButton: {
    flex: 1,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm
  },
  confirmYesHover: {
    backgroundColor: "#BBF7D0"
  },
  confirmYesText: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "700"
  },
  confirmNoButton: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm
  },
  confirmNoHover: {
    backgroundColor: "#FECACA"
  },
  confirmNoText: {
    color: "#991B1B",
    fontSize: 14,
    fontWeight: "700"
  },
  confirmPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }]
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
    fontSize: 13,
    textAlign: "center"
  }
});
