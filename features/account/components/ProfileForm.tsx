"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

interface ProfileFormProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [image, setImage] = useState(user.image ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    const { error: updateError } = await authClient.updateUser({
      name: name.trim(),
      image: image.trim() || undefined,
    });

    if (updateError) {
      setError(updateError.message ?? "Could not update your profile. Please try again.");
      setIsSaving(false);
      return;
    }

    setMessage("Profile updated.");
    setIsSaving(false);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-bold text-gray-secondary">
          Display name
        </label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-12 rounded-xl border-transparent bg-white/60 px-4 focus-visible:ring-2 focus-visible:ring-accent-500/40"
          placeholder="Your name"
          minLength={2}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-bold text-gray-secondary">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          value={user.email}
          className="h-12 rounded-xl border-transparent bg-white/60 px-4 text-gray-tertiary"
          readOnly
          disabled
        />
        <p className="text-xs text-gray-quaternary">Your email address cannot be changed here.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="image" className="block text-sm font-bold text-gray-secondary">
          Profile image URL
        </label>
        <Input
          id="image"
          name="image"
          type="url"
          value={image}
          onChange={(event) => setImage(event.target.value)}
          className="h-12 rounded-xl border-transparent bg-white/60 px-4 focus-visible:ring-2 focus-visible:ring-accent-500/40"
          placeholder="https://example.com/avatar.jpg"
        />
        {image ? (
          <img
            src={image}
            alt="Profile image preview"
            className="mt-2 size-14 rounded-full border border-white/50 object-cover"
          />
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm font-medium text-accent-700">
          {message}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isSaving}
        className="h-12 w-full rounded-2xl bg-gray-primary font-semibold text-white hover:bg-gray-secondary sm:w-auto sm:px-8"
      >
        {isSaving ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Saving…
          </>
        ) : (
          "Save profile"
        )}
      </Button>
    </form>
  );
}
