"use server";
import { action } from "@/server/security/action";
import { requireUser } from "@/server/auth/session";
import { createReport, reportSchema } from "@/server/services/reports";

export const createReportAction = action(reportSchema, async (input) => {
  const user = await requireUser();
  await createReport(user.id, input);
});
