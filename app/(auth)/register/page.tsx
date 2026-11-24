import RegisterForm from "@/features/auth/components/RegisterForm";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default function RegisterPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl justify-center px-4 py-12">
      <RegisterForm />
    </div>
  );
}
