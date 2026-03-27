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
import { motion } from "framer-motion";
import Link from "next/link";

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      <Card className="glass-component border-white/40 shadow-2xl/40">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-gray-tertiary hover:text-gray-primary transition-colors group mb-2"
            >
              <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium text-sm">Back to Home</span>
            </Link>
          </div>
          <CardTitle className="text-3xl font-black text-gray-primary tracking-tighter">
            WELCOME BACK
          </CardTitle>
          <CardDescription className="text-gray-tertiary font-medium">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Button
            size="lg"
            className="w-full bg-accent-500 hover:bg-accent-600 hover:cursor-pointer text-gray-primary font-black py-7 rounded-2xl shadow-xl shadow-accent-500/20 active:scale-95 transition-all text-lg group"
            onClick={handleGithubSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <Github className="size-6 mr-3 group-hover:scale-110 transition-transform" />
                Sign in with GitHub
              </>
            )}
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center">
          <p className="text-xs text-gray-quaternary font-medium px-6">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
