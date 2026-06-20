"use server";

import { revalidatePath } from "next/cache";
import { updateCurrentSalonSettings } from "@/services/settings.service";

export type SettingsActionState = {
  message: string;
  status: "error" | "idle" | "success";
};

export async function updateSalonSettingsAction(
  _previousState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const result = await updateCurrentSalonSettings({
    city: getFormValue(formData, "city"),
    name: getFormValue(formData, "name"),
    phone: getFormValue(formData, "phone"),
  });

  if (result.success) {
    revalidatePath("/configuracoes");
  }

  return {
    message: result.message,
    status: result.success ? "success" : "error",
  };
}

function getFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
