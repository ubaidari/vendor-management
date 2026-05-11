import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Keyboard,
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
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, spacing } from "@/constants/theme";
import { useTaskStore } from "@/hooks/useTaskStore";
import { apiClient } from "@/services/apiClient";
import { downloadTaskInvoice } from "@/services/invoiceDownload";
import { taskService } from "@/services/taskService";
import { getVendorNameForCitySlug } from "@/constants/locationCatalog";
import { costNumberToInput, parseCostInteger, sanitizeIntegerCostInput } from "@/utils/costInput";
import { playTransactionSuccessTune } from "@/utils/playTransactionSuccessTune";

/** Extra space under the form so the last field can scroll above the keyboard. */
const SCROLL_BOTTOM_BASE = 280;

type CostFieldKey = "labour" | "installation" | "installationComments";

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

export default function VendorTaskDetailScreen() {
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const insets = useSafeAreaInsets();
  const { tasks, updateTaskCosts, holdTask, markTaskCompleted, refresh } = useTaskStore();
  const sessionSlug = apiClient.getSessionSlug();
  const cityName = apiClient.getSessionLocationName();
  const expectedVendor = getVendorNameForCitySlug(sessionSlug);
  const [celebration, setCelebration] = useState<
    { kind: "completed" | "hold"; taskTitle: string } | null
  >(null);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [isHoldPending, setIsHoldPending] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  const task = tasks.find((item) => item.id === taskId);

  const [labourCost, setLabourCost] = useState(() => (task ? costNumberToInput(task.labourCost) : ""));
  const [installationCost, setInstallationCost] = useState(() =>
    task ? costNumberToInput(task.installationCost) : ""
  );
  /** Stored as `extraReason` in the API; vendor UI labels it installation comments. */
  const [installationComments, setInstallationComments] = useState(() =>
    task?.extraReason && task.extraReason !== "N/A" ? task.extraReason : ""
  );
  const scrollRef = useRef<ScrollView>(null);
  const tickScale = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const [keyboardPad, setKeyboardPad] = useState(0);
  const keyboardHeightRef = useRef(0);
  const fieldLayoutRef = useRef<Record<CostFieldKey, { y: number; height: number }>>({
    labour: { y: 0, height: 0 },
    installation: { y: 0, height: 0 },
    installationComments: { y: 0, height: 0 }
  });
  const formCardYInScroll = useRef(0);
  const focusedCostFieldRef = useRef<CostFieldKey | null>(null);

  const CELEBRATION_NAV_MS = 2200;

  const scrollCostFieldIntoView = useCallback(
    (field: CostFieldKey): void => {
      const run = (): void => {
        const { y: innerY, height: innerH } = fieldLayoutRef.current[field];
        const fieldTop = formCardYInScroll.current + innerY;
        const fieldBottom = fieldTop + Math.max(innerH, 56);
        const winH = Dimensions.get("window").height;
        const kb = keyboardHeightRef.current;
        const headerBand = insets.top + 52;
        const visibleH = Math.max(180, winH - headerBand - kb - insets.bottom);
        const margin = 24;
        const targetY = fieldBottom - visibleH + margin;
        scrollRef.current?.scrollTo({ y: Math.max(0, targetY), animated: true });
      };
      requestAnimationFrame(run);
      setTimeout(run, Platform.OS === "android" ? 200 : 90);
    },
    [insets.top, insets.bottom]
  );

  useEffect(() => {
    if (keyboardPad <= 0) {
      return;
    }
    const field = focusedCostFieldRef.current;
    if (!field) {
      return;
    }
    scrollCostFieldIntoView(field);
  }, [keyboardPad, scrollCostFieldIntoView]);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, (e) => {
      keyboardHeightRef.current = e.endCoordinates.height;
      setKeyboardPad(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvt, () => {
      keyboardHeightRef.current = 0;
      setKeyboardPad(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (!celebration) {
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
      setCelebration(null);
      router.replace("/vendor/my-tasks");
    }, CELEBRATION_NAV_MS);

    return () => clearTimeout(navTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cardOpacity & tickScale are stable Animated refs
  }, [celebration]);

  useEffect(() => {
    if (!task) {
      return;
    }
    setLabourCost(costNumberToInput(task.labourCost));
    setInstallationCost(costNumberToInput(task.installationCost));
    setInstallationComments(task.extraReason && task.extraReason !== "N/A" ? task.extraReason : "");
  }, [task]);

  const totalCost = useMemo(() => {
    return (
      parseCostInteger(labourCost) +
      parseCostInteger(installationCost) +
      (task?.repairCost ?? 0) +
      (task?.extraCost ?? 0)
    );
  }, [labourCost, installationCost, task?.repairCost, task?.extraCost]);

  if (!task) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Task not found</Text>
        <Text style={styles.subtitle}>Please return to My Tasks and select an assigned task.</Text>
      </View>
    );
  }

  if (expectedVendor && task.vendor !== expectedVendor) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Not available in this city</Text>
        <Text style={styles.subtitle}>
          This task is assigned to {task.vendor}, but the vendor portal for {cityName ?? "this city"} is{" "}
          {expectedVendor}. Log out from Portals and sign in again with the correct city PIN, or open a task for your
          location.
        </Text>
        <Pressable style={styles.backLink} onPress={() => router.replace("/vendor/my-tasks")}>
          <Text style={styles.backLinkText}>Back to My Tasks</Text>
        </Pressable>
      </View>
    );
  }

  const handleHoldTask = async (): Promise<void> => {
    setIsHoldPending(true);
    try {
      await updateTaskCosts({
        taskId: task.id,
        labourCost: parseCostInteger(labourCost),
        installationCost: parseCostInteger(installationCost),
        repairCost: task.repairCost,
        extraCost: task.extraCost,
        extraReason: installationComments.trim() || "N/A"
      });
      await holdTask(task.id);
      await playTransactionSuccessTune();
      setCelebration({ kind: "hold", taskTitle: task.title });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to hold task.";
      Alert.alert("Hold Failed", message);
    } finally {
      setIsHoldPending(false);
    }
  };

  const handleMarkCompleted = async (): Promise<void> => {
    setIsMarkingComplete(true);
    try {
      await updateTaskCosts({
        taskId: task.id,
        labourCost: parseCostInteger(labourCost),
        installationCost: parseCostInteger(installationCost),
        repairCost: task.repairCost,
        extraCost: task.extraCost,
        extraReason: installationComments.trim() || "N/A"
      });
      await markTaskCompleted(task.id);
      await playTransactionSuccessTune();
      setCelebration({ kind: "completed", taskTitle: task.title });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to complete task.";
      Alert.alert("Update Failed", message);
    } finally {
      setIsMarkingComplete(false);
    }
  };

  const toInvoiceJpegUri = async (sourceUri: string): Promise<string> => {
    const out = await ImageManipulator.manipulateAsync(sourceUri, [], {
      compress: 0.85,
      format: ImageManipulator.SaveFormat.JPEG
    });
    return out.uri;
  };

  const uploadInvoiceFromUri = async (sourceUri: string): Promise<void> => {
    setUploadingInvoice(true);
    try {
      const jpegUri = await toInvoiceJpegUri(sourceUri);
      const form = new FormData();
      form.append("invoice", {
        uri: jpegUri,
        name: "invoice.jpg",
        type: "image/jpeg"
      } as unknown as Blob);
      await taskService.uploadTaskInvoice(task.id, form);
      await refresh();
      Alert.alert("Invoice uploaded", "Your invoice was saved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      Alert.alert("Upload failed", message);
    } finally {
      setUploadingInvoice(false);
    }
  };

  const pickInvoiceFromLibrary = async (): Promise<void> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo library access to attach an invoice.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: false
    });
    if (result.canceled || !result.assets[0]) {
      return;
    }
    const asset = result.assets[0];
    await uploadInvoiceFromUri(asset.uri);
  };

  const takeInvoicePhoto = async (): Promise<void> => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow camera access to photograph an invoice.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85
    });
    if (result.canceled || !result.assets[0]) {
      return;
    }
    const asset = result.assets[0];
    await uploadInvoiceFromUri(asset.uri);
  };

  const handleDownloadInvoice = async (): Promise<void> => {
    try {
      await downloadTaskInvoice(task.id, `invoice_${task.id}.jpg`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Download failed.";
      Alert.alert("Download failed", message);
    }
  };

  const isVendorActionBusy = isMarkingComplete || isHoldPending;

  return (
    <>
    <KeyboardAvoidingView
      style={styles.keyboardRoot}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 52 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: SCROLL_BOTTOM_BASE + keyboardPad }
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
      >
      <View style={styles.iconWrap}>
        <MaterialIcons name="description" size={28} color={colors.primary} />
      </View>
      <Text style={styles.title}>{task.title}</Text>
      <Text style={styles.subtitle}>Task ID: {task.id}</Text>

      <View style={styles.detailCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Branch</Text>
          <Text style={styles.value}>{task.branch}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Category</Text>
          <Text style={styles.value}>{task.category}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>
            {task.status === "in-progress"
              ? "In Progress"
              : task.status === "on-hold"
                ? "On Hold"
                : task.status}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Vendor</Text>
          <Text style={styles.value}>{task.vendor}</Text>
        </View>
        <View style={[styles.row, styles.descriptionRow]}>
          <Text style={styles.label}>Description</Text>
          <Text style={[styles.value, styles.descriptionValue]}>
            {task.description && task.description.trim().length > 0 ? task.description : "N/A"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Assigned On</Text>
          <Text style={styles.value}>{formatDateTime(task.createdAt)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Completed On</Text>
          <Text style={styles.value}>{formatDateTime(task.completedAt)}</Text>
        </View>
      </View>

      <View
        style={styles.formCard}
        onLayout={(e) => {
          formCardYInScroll.current = e.nativeEvent.layout.y;
        }}
      >
        <Text style={styles.formTitle}>Cost Updates</Text>

        <View
          style={styles.inputGroup}
          onLayout={(e) => {
            const { y, height } = e.nativeEvent.layout;
            fieldLayoutRef.current.labour = { y, height };
          }}
        >
          <Text style={styles.inputLabel}>Labour Cost</Text>
          <TextInput
            value={labourCost}
            onChangeText={(t) => setLabourCost(sanitizeIntegerCostInput(t))}
            keyboardType="number-pad"
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            onFocus={() => {
              focusedCostFieldRef.current = "labour";
              scrollCostFieldIntoView("labour");
            }}
            onBlur={() => {
              focusedCostFieldRef.current = null;
            }}
          />
        </View>

        <View
          style={styles.inputGroup}
          onLayout={(e) => {
            const { y, height } = e.nativeEvent.layout;
            fieldLayoutRef.current.installation = { y, height };
          }}
        >
          <Text style={styles.inputLabel}>Installation Cost</Text>
          <TextInput
            value={installationCost}
            onChangeText={(t) => setInstallationCost(sanitizeIntegerCostInput(t))}
            keyboardType="number-pad"
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            onFocus={() => {
              focusedCostFieldRef.current = "installation";
              scrollCostFieldIntoView("installation");
            }}
            onBlur={() => {
              focusedCostFieldRef.current = null;
            }}
          />
        </View>

        <View
          style={styles.inputGroup}
          onLayout={(e) => {
            const { y, height } = e.nativeEvent.layout;
            fieldLayoutRef.current.installationComments = { y, height };
          }}
        >
          <Text style={styles.inputLabel}>Installation cost comments</Text>
          <TextInput
            value={installationComments}
            onChangeText={setInstallationComments}
            style={styles.textArea}
            multiline
            textAlignVertical="top"
            scrollEnabled
            placeholder="Notes on installation work or costs (optional)"
            placeholderTextColor={colors.textSecondary}
            onFocus={() => {
              focusedCostFieldRef.current = "installationComments";
              scrollCostFieldIntoView("installationComments");
            }}
            onBlur={() => {
              focusedCostFieldRef.current = null;
            }}
          />
        </View>
      </View>

      <View style={styles.invoiceCard}>
        <Text style={styles.formTitle}>Invoice</Text>
        <Text style={styles.invoiceHint}>
          {task.hasInvoice
            ? `On file${task.invoiceUploadedAt ? ` · ${formatDateTime(task.invoiceUploadedAt)}` : ""}`
            : "Upload a photo of your invoice as JPEG (library or camera; other photos are converted). You can replace it anytime."}
        </Text>
        <View style={styles.invoiceButtonRow}>
          <Pressable
            style={({ hovered, pressed }) => [
              styles.invoiceOutlineButton,
              hovered && styles.invoiceOutlineButtonHover,
              pressed && styles.invoiceOutlineButtonPress,
              (uploadingInvoice || isVendorActionBusy) && styles.invoiceOutlineButtonDisabled
            ]}
            onPress={() => void pickInvoiceFromLibrary()}
            disabled={uploadingInvoice || isVendorActionBusy}
          >
            <MaterialIcons name="photo-library" size={18} color={colors.primary} />
            <Text style={styles.invoiceOutlineButtonText}>
              {uploadingInvoice ? "Uploading…" : "Choose photo"}
            </Text>
          </Pressable>
          <Pressable
            style={({ hovered, pressed }) => [
              styles.invoiceOutlineButton,
              hovered && styles.invoiceOutlineButtonHover,
              pressed && styles.invoiceOutlineButtonPress,
              (uploadingInvoice || isVendorActionBusy) && styles.invoiceOutlineButtonDisabled
            ]}
            onPress={() => void takeInvoicePhoto()}
            disabled={uploadingInvoice || isVendorActionBusy}
          >
            <MaterialIcons name="photo-camera" size={18} color={colors.primary} />
            <Text style={styles.invoiceOutlineButtonText}>Camera</Text>
          </Pressable>
        </View>
        {task.hasInvoice ? (
          <Pressable
            style={({ hovered, pressed }) => [
              styles.invoiceLinkButton,
              hovered && styles.invoiceLinkButtonHover,
              pressed && styles.buttonPressed
            ]}
            onPress={() => void handleDownloadInvoice()}
          >
            <MaterialIcons name="download" size={18} color={colors.primary} />
            <Text style={styles.invoiceLinkText}>Download current invoice</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Current Total</Text>
        <Text style={styles.totalValue}>PKR {totalCost.toLocaleString()}</Text>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          style={({ hovered, pressed }) => [
            styles.secondaryButton,
            hovered && styles.secondaryButtonHover,
            pressed && styles.secondaryButtonPress,
            pressed && styles.buttonPressed
          ]}
          onPress={handleHoldTask}
          disabled={isVendorActionBusy}
        >
          <Text style={[styles.secondaryButtonText, isHoldPending && styles.secondaryButtonTextBusy]}>
            {isHoldPending ? "Putting on hold…" : "Hold"}
          </Text>
        </Pressable>
        <Pressable
          style={({ hovered, pressed }) => [
            styles.primaryButton,
            hovered && styles.primaryButtonHover,
            pressed && styles.buttonPressed,
            isVendorActionBusy && styles.primaryButtonDisabled
          ]}
          onPress={handleMarkCompleted}
          disabled={isVendorActionBusy}
        >
          <Text style={styles.primaryButtonText}>
            {isMarkingComplete ? "Saving…" : "Mark Completed"}
          </Text>
        </Pressable>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>

    <Modal visible={celebration !== null} transparent animationType="fade">
      <View style={styles.successBackdrop}>
        <Animated.View style={[styles.successCard, { opacity: cardOpacity }]}>
          <Animated.View
            style={[
              styles.successRing,
              celebration?.kind === "hold" && styles.successRingHold,
              { transform: [{ scale: tickScale }] }
            ]}
          >
            <MaterialIcons
              name={celebration?.kind === "hold" ? "pause" : "check"}
              size={46}
              color="#FFFFFF"
            />
          </Animated.View>
          <Text style={styles.successTitle}>
            {celebration?.kind === "hold" ? "Task on hold" : "Task completed"}
          </Text>
          {celebration ? (
            <View style={styles.successTextBlock}>
              <Text style={styles.successSubtitle} numberOfLines={3}>
                {celebration.taskTitle}
              </Text>
              <Text style={styles.successHint}>
                {celebration.kind === "hold"
                  ? "Admin will see this as on hold. Returning to My Tasks…"
                  : "Costs saved. Returning to My Tasks…"}
              </Text>
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
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  scrollContent: {
    flexGrow: 1,
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
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm
  },
  backLink: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 10
  },
  backLinkText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.sm
  },
  formCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md
  },
  invoiceCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.sm
  },
  invoiceHint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: spacing.xs
  },
  invoiceButtonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  invoiceOutlineButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md
  },
  invoiceOutlineButtonHover: {
    backgroundColor: "#F3F7FF"
  },
  invoiceOutlineButtonPress: {
    opacity: 0.92
  },
  invoiceOutlineButtonDisabled: {
    opacity: 0.5
  },
  invoiceOutlineButtonText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14
  },
  invoiceLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    paddingVertical: spacing.xs
  },
  invoiceLinkButtonHover: {
    opacity: 0.85
  },
  invoiceLinkText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  inputGroup: {
    marginBottom: spacing.sm
  },
  inputLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontSize: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  textArea: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontSize: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md
  },
  descriptionRow: {
    alignItems: "flex-start"
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary
  },
  value: {
    flex: 1,
    textAlign: "right",
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600"
  },
  descriptionValue: {
    textAlign: "left",
    fontWeight: "500"
  },
  costValue: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "700"
  },
  totalCard: {
    marginTop: spacing.md,
    backgroundColor: "#EAF1FF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#C9D9FF",
    padding: spacing.md
  },
  totalLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs
  },
  totalValue: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary
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
  successRingHold: {
    backgroundColor: "#D97706"
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
  },
  buttonRow: {
    marginTop: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface
  },
  secondaryButtonHover: {
    borderColor: colors.primary,
    backgroundColor: "#E8EEFC",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2
  },
  secondaryButtonPress: {
    borderColor: "#1E3A8A",
    backgroundColor: "#D8E4FF"
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  secondaryButtonTextBusy: {
    color: colors.primary
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  primaryButtonHover: {
    backgroundColor: "#1A337A"
  },
  primaryButtonDisabled: {
    opacity: 0.75
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }]
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700"
  }
});
