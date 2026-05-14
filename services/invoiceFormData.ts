import * as ImageManipulator from "expo-image-manipulator";
import { InteractionManager, Platform } from "react-native";

/**
 * Builds multipart FormData for `POST /tasks/:id/invoice`.
 * On native, React Native expects `{ uri, name, type }` on the `invoice` field.
 * On web, the runtime must send a real Blob/File or the part is empty and multer rejects it.
 */
export async function buildTaskInvoiceFormData(sourceUri: string): Promise<FormData> {
  if (Platform.OS === "web") {
    let readUri = sourceUri;
    try {
      const out = await ImageManipulator.manipulateAsync(sourceUri, [], {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG
      });
      readUri = out.uri;
    } catch {
      /* Picker URI may already be JPEG; fetch below still works. */
    }

    const res = await fetch(readUri);
    if (!res.ok) {
      throw new Error("Could not read the selected image for upload.");
    }
    const blob = await res.blob();
    const form = new FormData();

    if (typeof File !== "undefined") {
      form.append("invoice", new File([blob], "invoice.jpg", { type: "image/jpeg" }));
    } else {
      form.append("invoice", blob, "invoice.jpg");
    }

    return form;
  }

  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
  const out = await ImageManipulator.manipulateAsync(sourceUri, [], {
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG
  });
  const form = new FormData();
  form.append(
    "invoice",
    {
      uri: out.uri,
      name: "invoice.jpg",
      type: "image/jpeg"
    } as unknown as Blob
  );
  return form;
}
