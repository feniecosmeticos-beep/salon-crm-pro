"use server";

import { revalidatePath } from "next/cache";
import {
  createFollowUp,
  updateFollowUpStatus,
} from "@/services/followups.service";

export type FollowUpActionState = {
  message: string;
  status: "error" | "idle" | "success";
  submissionId: string;
};

export async function createFollowUpAction(
  _previousState: FollowUpActionState,
  formData: FormData
): Promise<FollowUpActionState> {
  const clientId = getFormValue(formData, "clientId");
  const result = await createFollowUp({
    clientId,
    suggestedDate: getFormValue(formData, "suggestedDate"),
    suggestedMessage: getFormValue(formData, "suggestedMessage"),
    title: getFormValue(formData, "title"),
    type: getFormValue(formData, "type"),
  });

  if (result.success) {
    revalidatePath("/followups");
    revalidatePath("/follow-ups");
    revalidatePath(`/clientes/${clientId}`);
  }

  return {
    message: result.message,
    status: result.success ? "success" : "error",
    submissionId: crypto.randomUUID(),
  };
}

export async function updateFollowUpStatusAction(input: {
  followUpId: string;
  status: "done" | "pending";
}) {
  const result = await updateFollowUpStatus(input.followUpId, input.status);

  if (result.success) {
    revalidatePath("/followups");
    revalidatePath("/follow-ups");

    if (result.followUp?.client_id) {
      revalidatePath(`/clientes/${result.followUp.client_id}`);
    }
  }

  return result;
}

function getFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
