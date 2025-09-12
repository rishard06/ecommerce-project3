"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SearchIcon, ShoppingBagIcon, HeartIcon, UserIcon } from "lucide-react";
import { signIn, signOut, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

export default function Header({ session }) {
  const [hover, setHover] = useState(false);
  const router = useRouter();
  
  const handleSearch = (e) => {
    e.preventDefault();
  };

  return (
    <header className="fixed top-0 z-50 w-full px-4 py-6">
      <div className="bg-white/50 backdrop-blur-xl rounded-3xl drop-shadow-2xl max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/">
          <div className="text-4xl font-bold flex items-center">
            <h1 className="text-blue-800 ">v</h1>enn.
          </div>
        </Link>

        <form
          onSubmit={handleSearch}
          className="flex-1 max-w-md mx-8 bg-white/30 rounded-full"
        >
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Search products..."
              className="input w-full pl-10 rounded-full p-3"
              // value={searchQuery}
              // onChange={(e) => setSearchQuery(e.target.value)}
            />
            <SearchIcon className="absolute left-3 top- h-5 w-5 text-gray-400" />
          </div>
        </form>

        <div className="flex items-center space-x-4">
          <Link
            href="/favorites"
            className="p-2 rounded-full hover:bg-surface-dark"
          >
            <HeartIcon className="h-6 w-6 text-gray-600" />
          </Link>
          <Link href="/cart" className="p-2 rounded-full hover:bg-surface-dark">
            <ShoppingBagIcon className="h-6 w-6 text-gray-600" />
          </Link>

          <div>
            <svg className="absolute w-0 h-0">
              <defs>
                <filter
                  id="gooey-strong"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feGaussianBlur
                    in="SourceGraphic"
                    stdDeviation="10"
                    result="blur"
                  />
                  <feColorMatrix
                    in="blur"
                    mode="matrix"
                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
                    result="gooey"
                  />
                  <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
                </filter>

                <filter
                  id="gooey-medium"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feGaussianBlur
                    in="SourceGraphic"
                    stdDeviation="8"
                    result="blur"
                  />
                  <feColorMatrix
                    in="blur"
                    mode="matrix"
                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -9"
                    result="gooey"
                  />
                  <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
                </filter>
              </defs>
            </svg>

            <div
              style={{ filter: "url(#gooey-medium)" }}
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
            >
              {/* Login button - Element 1 */}
              <motion.button
                className=" px-4 py-2 bg-white rounded-full font-medium flex items-center gap-2 z-10"
                animate={{
                  scale: hover ? 1.1 : 1,
                }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <span className="hidden sm:block">
                  {session?.user ? (
                    session?.user.name
                  ) : (
                    <button
                      onClick={async () =>
                        await signIn.social({ provider: "github" })
                      }
                      className="hover:cursor-pointer"
                    >
                      Sign In
                    </button>
                  )}
                </span>
                <div className="w-8 h-8 rounded-full shadow-lg bg-gray-300 overflow-hidden">
                  {session?.user ? (
                    <img
                      src={session?.user.image}
                      alt="User"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-full w-full p-1 text-gray-500" />
                  )}
                </div>

                {/* Register button - Element 2 */}
                {session?.user ? (
                  <motion.button
                    className="absolute px-4 py-2 bg-white rounded-full"
                    animate={{
                      // y: hover ? 50 : 50,
                      x: hover ? -110 : -40,
                      scale: hover ? 1.1 : 0,
                      opacity: hover ? 1 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  >
                    <div
                      onClick={async () => {
                        await authClient.revokeSessions();
                        await signOut();
                        router.refresh();
                      }}
                      className="hover:cursor-pointer fon"
                    >
                      sign out
                    </div>
                  </motion.button>
                ) : null}
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div></div>
    </header>
  );
}
