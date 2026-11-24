import { AdminDashboardSkeleton } from "@/features/admin/components/admin-dashboard-skeleton";

/**
 * Instant shell for `/admin` only. The other admin routes keep their own
 * `(admin)/loading.tsx`; this one mirrors the dashboard's denser geometry.
 */
export default function AdminDashboardLoading() {
  return <AdminDashboardSkeleton />;
}
