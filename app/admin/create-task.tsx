import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, spacing } from "@/constants/theme";
import { useTaskStore } from "@/hooks/useTaskStore";
import { BRANCHES_BY_SLUG, VENDOR_NAME_BY_SLUG, getVendorNameForCitySlug } from "@/constants/locationCatalog";
import { ADMIN_TASK_CATEGORIES } from "@/constants/adminTaskCategories";
import { getSessionCityDisplayLabel, type CitySlug } from "@/constants/locations";
import { apiClient } from "@/services/apiClient";
import { playTransactionSuccessTune } from "@/utils/playTransactionSuccessTune";

export default function AdminCreateTaskScreen() {
  const { addTask, branches, vendors, isLoading } = useTaskStore();
  const sessionSlug = apiClient.getSessionSlug();
  const currentLocationLabel = getSessionCityDisplayLabel(
    apiClient.getSessionSlug(),
    apiClient.getSessionLocationName()
  );

  /** Only branches for the current admin city (Lahore → L1, Islamabad → C4, Karachi → its five). */
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

  /** Only this city’s vendor (Karachi → KS_IT_KHI_VENDOR, etc.). */
  const vendorOptions = useMemo(() => {
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

  const [title, setTitle] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<(typeof ADMIN_TASK_CATEGORIES)[number]>(
    ADMIN_TASK_CATEGORIES[0]
  );
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [description, setDescription] = useState("");
  const [openDropdown, setOpenDropdown] = useState<"branch" | "category" | "vendor" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successCelebration, setSuccessCelebration] = useState<{
    vendor: string;
    branch: string;
  } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const tickScale = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (branchOptions.length === 0) {
      setSelectedBranch("");
      return;
    }
    if (!selectedBranch || !branchOptions.includes(selectedBranch)) {
      setSelectedBranch(branchOptions[0]);
    }
  }, [branchOptions, selectedBranch]);

  React.useEffect(() => {
    if (vendorOptions.length === 0) {
      setSelectedVendor("");
      return;
    }
    const preferred = vendorOptions[0];
    if (!selectedVendor || !vendorOptions.includes(selectedVendor)) {
      setSelectedVendor(preferred);
    }
  }, [vendorOptions, selectedVendor]);

  const CELEBRATION_NAV_MS = 2200;

  useEffect(() => {
    if (!successCelebration) {
      return;
    }
    tickScale.setValue(0);
    cardOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true
      }),
      Animated.spring(tickScale, {
        toValue: 1,
        friction: 7,
        tension: 100,
        useNativeDriver: true
      })
    ]).start();

    const navTimer = setTimeout(() => {
      setSuccessCelebration(null);
      router.replace("/admin/tasks");
    }, CELEBRATION_NAV_MS);

    return () => clearTimeout(navTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cardOpacity & tickScale are stable Animated refs
  }, [successCelebration]);

  const handleSubmit = async (): Promise<void> => {
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();

    if (!normalizedTitle) {
      Alert.alert("Missing Task Title", "Please enter a task title before submitting.");
      return;
    }

    if (!selectedBranch) {
      Alert.alert("Missing Assigned Branch", "Please select an assigned branch.");
      return;
    }

    if (!selectedVendor) {
      Alert.alert("Missing Assigned Vendor", "Please select an assigned vendor.");
      return;
    }

    setIsSubmitting(true);

    try {
      await addTask({
        title: normalizedTitle,
        branch: selectedBranch,
        category: selectedCategory,
        vendor: selectedVendor,
        description: normalizedDescription
      });

      await playTransactionSuccessTune();

      setSuccessCelebration({ vendor: selectedVendor, branch: selectedBranch });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create task";
      Alert.alert("Create Task Failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <KeyboardAvoidingView
      style={styles.keyboardRoot}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
      <Text style={styles.heading}>Create Task</Text>
      <Text style={styles.subheading}>{currentLocationLabel}</Text>
      {isLoading && <Text style={styles.loadingText}>Loading branches and vendors...</Text>}
      {!isLoading && branchOptions.length === 0 && sessionSlug ? (
        <Text style={styles.warnText}>
          No branches loaded for this city. Confirm the API is running and you chose the correct city, then pull to
          refresh or reopen this screen.
        </Text>
      ) : null}
      {!isLoading && vendorOptions.length === 0 && sessionSlug ? (
        <Text style={styles.warnText}>
          No vendor loaded for this city. Run the database seed after updating vendor names, then refresh.
        </Text>
      ) : null}
      <Pressable style={styles.backButton} onPress={() => router.push("/admin/dashboard")}>
        <MaterialIcons name="arrow-back" size={16} color={colors.textPrimary} />
        <Text style={styles.backButtonText}>Back to Admin Home</Text>
      </Pressable>

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Task Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Enter task title"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
        />
      </View>

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Assigned branch — {currentLocationLabel}</Text>
        <Pressable
          style={styles.dropdownTrigger}
          onPress={() => setOpenDropdown((prev) => (prev === "branch" ? null : "branch"))}
        >
          <Text style={styles.dropdownValue}>{selectedBranch || "Select branch"}</Text>
          <MaterialIcons
            name={openDropdown === "branch" ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>
        {openDropdown === "branch" && (
          <View style={styles.dropdownMenu}>
            {branchOptions.map((branch) => (
              <Pressable
                key={branch}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedBranch(branch);
                  setOpenDropdown(null);
                }}
              >
                <Text style={styles.dropdownItemText}>{branch}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Category</Text>
        <Pressable
          style={styles.dropdownTrigger}
          onPress={() => setOpenDropdown((prev) => (prev === "category" ? null : "category"))}
        >
          <Text style={styles.dropdownValue}>{selectedCategory}</Text>
          <MaterialIcons
            name={openDropdown === "category" ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>
        {openDropdown === "category" && (
          <View style={styles.dropdownMenu}>
            {ADMIN_TASK_CATEGORIES.map((category) => (
              <Pressable
                key={category}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedCategory(category);
                  setOpenDropdown(null);
                }}
              >
                <Text style={styles.dropdownItemText}>{category}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Assigned vendor — {currentLocationLabel}</Text>
        <Pressable
          style={styles.dropdownTrigger}
          onPress={() => setOpenDropdown((prev) => (prev === "vendor" ? null : "vendor"))}
        >
          <Text style={styles.dropdownValue}>{selectedVendor || "Select vendor"}</Text>
          <MaterialIcons
            name={openDropdown === "vendor" ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>
        {openDropdown === "vendor" && (
          <View style={styles.dropdownMenu}>
            {vendorOptions.map((vendor) => (
              <Pressable
                key={vendor}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedVendor(vendor);
                  setOpenDropdown(null);
                }}
              >
                <Text style={styles.dropdownItemText}>{vendor}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Add task details, scope, or notes"
          placeholderTextColor={colors.textSecondary}
          style={styles.textArea}
          multiline
          textAlignVertical="top"
          onFocus={() => {
            requestAnimationFrame(() => {
              scrollRef.current?.scrollToEnd({ animated: true });
            });
          }}
        />
      </View>

      <View style={styles.helperCard}>
        <MaterialIcons name="info-outline" size={16} color={colors.primary} />
        <Text style={styles.helperText}>
          {`In this city, the vendor portal lists tasks for: ${getVendorNameForCitySlug(apiClient.getSessionSlug()) ?? "this city's vendor"}.`}
        </Text>
      </View>

      <Pressable
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting || isLoading}
      >
        <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
        <Text style={styles.submitText}>{isSubmitting ? "Creating..." : "Create Task"}</Text>
      </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>

    <Modal visible={successCelebration !== null} transparent animationType="fade">
      <View style={styles.successBackdrop}>
        <Animated.View style={[styles.successCard, { opacity: cardOpacity }]}>
          <Animated.View style={[styles.successRing, { transform: [{ scale: tickScale }] }]}>
            <MaterialIcons name="check" size={46} color="#FFFFFF" />
          </Animated.View>
          <Text style={styles.successTitle}>Task created</Text>
          {successCelebration ? (
            <View style={styles.successTextBlock}>
              <Text style={styles.successSubtitle}>
                Assigned to {successCelebration.vendor} at {successCelebration.branch}.
              </Text>
              <Text style={styles.successHint}>The vendor will see this in My Tasks.</Text>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
    backgroundColor: colors.background
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: 280
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
    marginBottom: spacing.md
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.sm
  },
  warnText: {
    fontSize: 13,
    color: "#B45309",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.md
  },
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  backButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600"
  },
  fieldWrap: {
    marginBottom: spacing.md
  },
  label: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: "600",
    marginBottom: spacing.xs
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary
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
  dropdownValue: {
    color: colors.textPrimary,
    fontSize: 14,
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
    fontSize: 13,
    color: colors.textPrimary
  },
  textArea: {
    minHeight: 120,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary
  },
  helperCard: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "#C9D9FF",
    backgroundColor: "#EAF1FF",
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  helperText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 12
  },
  submitButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  submitButtonDisabled: {
    opacity: 0.85
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700"
  },
  successBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.48)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg
  },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: "center",
    maxWidth: 340,
    width: "100%",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12
  },
  successRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  successTextBlock: {
    alignItems: "center",
    gap: spacing.xs
  },
  successSubtitle: {
    fontSize: 15,
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: 22
  },
  successHint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs
  }
});
