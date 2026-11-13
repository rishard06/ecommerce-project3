import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function getAccountSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireAccountSession(nextPath = "/account") {
  const session = await getAccountSession();

  if (!session?.user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return session;
}
