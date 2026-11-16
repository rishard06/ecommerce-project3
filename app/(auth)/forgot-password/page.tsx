import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export const metadata = { title: "Forgot password | tended." };

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <ForgotPasswordForm />
    </main>
  );
}
