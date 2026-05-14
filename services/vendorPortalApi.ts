import { apiClient } from "@/services/apiClient";

const parseErrorMessage = (raw: string, fallback: string): string => {
  try {
    const parsed = JSON.parse(raw) as { message?: string };
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message.trim();
    }
  } catch {
    /* keep */
  }
  return fallback;
};

export type VendorPinVerifyResult = {
  slug: string;
  name: string;
  pinVersion: number;
};

/** No location headers — finds the city that owns this vendor portal PIN. */
export async function verifyVendorPortalPinOnServer(pin: string): Promise<VendorPinVerifyResult> {
  const base = apiClient.getBaseUrl().replace(/\/$/, "");
  const response = await fetch(`${base}/vendor/portal-pin/verify`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...apiClient.getLocationHeaders()
    },
    body: JSON.stringify({ pin: pin.trim() })
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(parseErrorMessage(raw, `Could not verify PIN (HTTP ${response.status}).`));
  }
  return JSON.parse(raw) as VendorPinVerifyResult;
}

export async function fetchVendorPortalPinStatus(): Promise<{ pinVersion: number }> {
  const base = apiClient.getBaseUrl().replace(/\/$/, "");
  const response = await fetch(`${base}/vendor/portal-pin/status`, {
    headers: {
      Accept: "application/json",
      ...apiClient.getLocationHeaders()
    }
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(parseErrorMessage(raw, `PIN status failed (HTTP ${response.status}).`));
  }
  return JSON.parse(raw) as { pinVersion: number };
}

export type AdminVendorPortalPinRow = {
  slug: string;
  name: string;
  vendorPin: string;
  vendorPinVersion: number;
};

export async function fetchAdminVendorPortalPins(): Promise<AdminVendorPortalPinRow[]> {
  const base = apiClient.getBaseUrl().replace(/\/$/, "");
  const response = await fetch(`${base}/admin/vendor-portal-pins`, {
    headers: {
      Accept: "application/json",
      ...apiClient.getLocationHeaders()
    }
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(parseErrorMessage(raw, `Could not load PINs (HTTP ${response.status}).`));
  }
  return JSON.parse(raw) as AdminVendorPortalPinRow[];
}

export async function patchAdminVendorPortalPin(
  targetSlug: string,
  vendorPin: string
): Promise<AdminVendorPortalPinRow & { ok?: boolean; unchanged?: boolean }> {
  const base = apiClient.getBaseUrl().replace(/\/$/, "");
  const response = await fetch(`${base}/admin/locations/${encodeURIComponent(targetSlug)}/vendor-pin`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...apiClient.getLocationHeaders()
    },
    body: JSON.stringify({ vendorPin: vendorPin.trim() })
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(parseErrorMessage(raw, `Could not update PIN (HTTP ${response.status}).`));
  }
  return JSON.parse(raw) as AdminVendorPortalPinRow & { ok?: boolean; unchanged?: boolean };
}
