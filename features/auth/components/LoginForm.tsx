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
import { Github, Loader2, ArrowLeft } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { motion, useReducedMotion } from "motion/react";
import { spring } from "@/lib/motion";
import Link from "next/link";

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const handleGithubSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn.social({
        provider: "github",
        callbackURL: "/",
      });
    } catch (error) {
      console.error("Sign in failed:", error);
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
              className="group mb-1 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-gray-tertiary transition-colors hover:text-gray-primary"
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

        <CardContent className="px-5 pt-5">
          <Button
            size="lg"
            className="h-12 w-full gap-2.5 rounded-2xl bg-accent-500 text-base font-semibold text-gray-primary shadow-soft hover:bg-accent-600"
            onClick={handleGithubSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
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
