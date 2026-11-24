import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = { title: "Forgot password | tended." };

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <ForgotPasswordForm />
    </main>
  );
}
