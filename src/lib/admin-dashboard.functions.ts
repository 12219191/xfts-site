import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DashboardData } from "@/lib/admin-dashboard.server";

type Result = { data: DashboardData } | { error: string };

/** KPIs executivos do Control Center. */
export const getAdminDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment?: string }) => data ?? {})
  .handler(async ({ data, context }): Promise<Result> => {
    const { requireAdminModule, AdminAccessError } = await import("@/lib/admin-rbac.server");
    try {
      await requireAdminModule(
        context.supabase,
        context.userId,
        (context.claims as { email?: string })?.email ?? "",
        "dashboard",
      );
    } catch (e) {
      if (e instanceof AdminAccessError) return { error: e.message };
      throw e;
    }
    const { buildDashboard } = await import("@/lib/admin-dashboard.server");
    return { data: await buildDashboard(data.environment ?? "live") };
  });
