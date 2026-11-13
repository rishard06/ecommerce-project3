"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github, Loader2, ArrowLeft } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { motion, useReducedMotion } from "motion/react";
import { spring } from "@/lib/motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const handleGithubSignIn = async () => {
    setIsGithubLoading(true);
    try {
      await signIn.social({
        provider: "github",
        callbackURL: next,
      });
    } catch (error) {
      console.error("Sign in failed:", error);
    } finally {
      setIsGithubLoading(false);
    }
  };

  const handleEmailSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await signIn.email({
        email,
        password,
        callbackURL: next,
      });
      if (result?.error) {
        const apiError = result.error as unknown as { message?: unknown };
        setError(
          typeof apiError.message === "string" && apiError.message.length > 0
            ? apiError.message
            : "Sign in failed. Check your email and password."
        );
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Sign in failed. Check your email and password."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.gentle}
      className="w-full max-w-md"
    >
      <Card className="glass-component border-white/40 p-2 shadow-panel">
        <CardHeader className="space-y-3 pt-6 text-center">
          <div className="flex justify-center">
            <Link
              href="/"
              className="group mb-1 inline-flex items-center gap-1.5 rounded px-2 py-1 text-sm font-medium text-gray-tertiary transition-colors hover:text-gray-primary"
            >
              <ArrowLeft
                className="size-4 transition-transform duration-200 ease-out-quart group-hover:-translate-x-0.5"
                aria-hidden="true"
              />
              Back to home
            </Link>
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight text-gray-primary md:text-3xl">
            <h1>Welcome back</h1>
          </CardTitle>
          <CardDescription className="font-medium text-gray-tertiary">
            Sign in to continue where you left off.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-5 pt-2">
          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 rounded-xl"
              autoComplete="email"
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 rounded-xl"
              autoComplete="current-password"
              required
            />
            {error ? (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className="h-12 w-full gap-2.5 rounded-2xl bg-gray-primary text-base font-semibold text-white shadow-soft hover:bg-gray-secondary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                  <span>Signing in…</span>
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-gray-quaternary">
            <span className="h-px flex-1 bg-gray-primary/10" />
            or
            <span className="h-px flex-1 bg-gray-primary/10" />
          </div>

          <Button
            size="lg"
            className="h-12 w-full gap-2.5 rounded-2xl bg-accent-500 text-base font-semibold text-gray-primary shadow-soft hover:bg-accent-600"
            onClick={handleGithubSignIn}
            disabled={isGithubLoading}
          >
            {isGithubLoading ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <Github className="size-5" aria-hidden="true" />
                Sign in with GitHub
              </>
            )}
          </Button>

          <p className="text-center text-sm text-gray-tertiary">
            No account?{" "}
            <Link href="/register" className="underline underline-offset-2 hover:text-gray-primary">
              Create one
            </Link>
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pb-6 text-center">
          <p className="px-6 text-xs font-medium leading-relaxed text-gray-quaternary">
            By signing in you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

export default function LoginForm() {
  return (
    <Suspense>
      <LoginFormInner />
    </Suspense>
  );
}
