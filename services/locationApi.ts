import { apiClient } from "@/services/apiClient";

export type PublicLocation = { slug: string; name: string };

const readJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  if (!response.ok) {
    try {
      const body = JSON.parse(text) as { message?: string };
      throw new Error(body.message ?? text ?? "Request failed");
    } catch (error) {
      if (error instanceof Error && error.message !== "Unexpected end of JSON input") {
        throw error;
      }
      throw new Error(text || "Request failed");
    }
  }
  return text ? (JSON.parse(text) as T) : (undefined as T);
};

export const locationApi = {
  listPublic: async (): Promise<PublicLocation[]> => {
    const response = await fetch(`${apiClient.getBaseUrl()}/locations`, {
      headers: {
        Accept: "application/json",
        ...apiClient.getLocationHeaders()
      }
    });
    return readJson<PublicLocation[]>(response);
  }
};
