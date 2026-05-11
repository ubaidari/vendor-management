import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { apiClient } from "@/services/apiClient";

async function fetchInvoiceBlobUrl(taskId: string): Promise<string> {
  const base = apiClient.getBaseUrl().replace(/\/$/, "");
  const url = `${base}/tasks/${taskId}/invoice`;
  const response = await fetch(url, {
    headers: {
      Accept: "image/jpeg",
      ...apiClient.getLocationHeaders()
    }
  });
  if (!response.ok) {
    throw new Error(`Could not load invoice (HTTP ${response.status}).`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

/**
 * Fetches the task invoice with portal headers and returns a URI suitable for `<Image source={{ uri }} />`.
 * On native, a JPEG is written under the app cache; on web, a `blob:` URL is used.
 * Always call {@link removeInvoicePreviewCacheFile} when finished to avoid leaking temp files / blob URLs.
 */
export async function cacheTaskInvoiceForPreview(taskId: string): Promise<string> {
  if (Platform.OS === "web") {
    return fetchInvoiceBlobUrl(taskId);
  }

  const base = apiClient.getBaseUrl().replace(/\/$/, "");
  const url = `${base}/tasks/${taskId}/invoice`;
  const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!cacheDir) {
    throw new Error("Local storage is not available on this device.");
  }
  const dest = `${cacheDir}invoice_preview_${taskId}_${Date.now()}.jpg`;
  const result = await FileSystem.downloadAsync(url, dest, {
    headers: {
      Accept: "image/jpeg",
      ...apiClient.getLocationHeaders()
    }
  });
  if (result.status !== 200) {
    throw new Error(`Could not load invoice (HTTP ${result.status}).`);
  }
  return result.uri;
}

/** Best-effort cleanup of a resource created by {@link cacheTaskInvoiceForPreview}. */
export async function removeInvoicePreviewCacheFile(uri: string): Promise<void> {
  if (uri.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(uri);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {
    /* ignore */
  }
}
