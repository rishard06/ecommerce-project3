import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import NavBar from "@/components/layout/NavBar";
import { getCurrentUser } from "@/features/identity/server/guards";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/**
 * Route-group guard for every admin page:
 * - anonymous visitors go to the login page;
 * - authenticated customers get a not-found page instead of a 500.
 *
 * The storefront chrome deliberately wraps every admin route so the dashboard
 * reads as part of the same store. The wrapper omits `bg-background` so the
 * body's sage gradient shows through, matching `/account`.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    notFound();
  }

  return (
    <div className="min-h-dvh text-foreground">
      <AnnouncementBar />
      <NavBar />
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        {children}
      </div>
    </div>
  );
}
