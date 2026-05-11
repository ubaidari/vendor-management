import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import { apiClient } from "@/services/apiClient";

/**
 * Download the task invoice with the same auth headers as the JSON API, then open the system share sheet.
 */
export async function downloadTaskInvoice(taskId: string, displayName: string): Promise<void> {
  const base = apiClient.getBaseUrl().replace(/\/$/, "");
  const url = `${base}/tasks/${taskId}/invoice`;

  if (Platform.OS === "web") {
    const response = await fetch(url, {
      headers: {
        Accept: "image/jpeg",
        ...apiClient.getLocationHeaders()
      }
    });
    if (!response.ok) {
      throw new Error(`Download failed (HTTP ${response.status})`);
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const fileName = displayName.toLowerCase().endsWith(".jpg") ? displayName : `${displayName.replace(/\.[^/.]+$/, "")}.jpg`;
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(objectUrl, {
          dialogTitle: fileName,
          mimeType: "image/jpeg"
        });
      } else if (typeof document !== "undefined") {
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = fileName;
        anchor.rel = "noopener";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        Alert.alert("Invoice", "Your browser should save the invoice as a JPEG.");
      } else {
        Alert.alert("Invoice", "Sharing is not available in this environment.");
      }
    } finally {
      globalThis.setTimeout(() => URL.revokeObjectURL(objectUrl), 45_000);
    }
    return;
  }

  const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!cacheDir) {
    throw new Error("Local storage is not available on this device.");
  }
  const dest = `${cacheDir}invoice_${taskId}_${Date.now()}.jpg`;
  const result = await FileSystem.downloadAsync(url, dest, {
    headers: {
      Accept: "image/jpeg",
      ...apiClient.getLocationHeaders()
    }
  });
  if (result.status !== 200) {
    throw new Error(`Download failed (HTTP ${result.status})`);
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      dialogTitle: displayName,
      mimeType: "image/jpeg",
      UTI: Platform.OS === "ios" ? "public.jpeg" : undefined
    });
  } else {
    Alert.alert("Invoice", `Saved to:\n${result.uri}`);
  }
}
