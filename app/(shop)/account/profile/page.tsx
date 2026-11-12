import { ProfileForm } from "@/features/account/components/ProfileForm";
import { requireAccountSession } from "@/features/account/require-session";

export default async function AccountProfilePage() {
  const session = await requireAccountSession("/account/profile");

  return (
    <div className="glass-component p-6 md:p-8">
      <div className="mb-6 space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-gray-primary">
          Profile
        </h2>
        <p className="text-sm text-gray-tertiary">
          This is how you appear across the store.
        </p>
      </div>

      <ProfileForm
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }}
      />
    </div>
  );
}
