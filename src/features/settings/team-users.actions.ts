"use server";

import { revalidatePath } from "next/cache";
import { updateTeamUserRole } from "@/services/team-users.service";

export async function updateTeamUserRoleAction(input: {
  role: string;
  userId: string;
}) {
  const result = await updateTeamUserRole(input.userId, input.role);

  if (result.success) {
    revalidatePath("/configuracoes");
  }

  return result;
}
