"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { signUp } from "@/lib/auth-client";
import Link from "next/link";

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError("Name must be at least 2 characters");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email");
    if (password.length < 8) return setError("Password must be at least 8 characters");
    setLoading(true);
    try {
      await signUp.email({ email, password, name, callbackURL: "/account" });
      router.push("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-component w-full max-w-md border-white/40 p-2 shadow-panel">
      <CardHeader className="space-y-2 pt-6 text-center">
        <CardTitle className="text-2xl font-semibold tracking-tight text-gray-primary">Create account</CardTitle>
        <CardDescription className="font-medium text-gray-tertiary">Demo only — no real data leaves your browser session.</CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-6 pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl" required />
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl" required />
          <Input placeholder="Password (8+ chars)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl" required />
          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="h-12 w-full rounded-2xl bg-gray-primary font-semibold text-white">
            {loading ? <><Loader2 className="size-5 animate-spin" /> Creating…</> : "Create account"}
          </Button>
          <p className="text-center text-sm text-gray-tertiary">
            Have an account? <Link href="/login" className="underline">Sign in</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
