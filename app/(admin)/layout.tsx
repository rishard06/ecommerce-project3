import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/features/identity/server/guards";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/**
 * Route-group guard for every admin page:
 * - anonymous visitors go to the login page;
 * - authenticated customers get a not-found page instead of a 500.
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
    <div className="bg-background min-h-dvh text-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">{children}</div>
    </div>
  );
}
