"use client"

import React from 'react'
import Link from 'next/link'
import { SearchIcon, ShoppingBagIcon, HeartIcon, UserIcon } from 'lucide-react'

export default function Header({ session }) {
  const handleSearch = (e) => {
    e.preventDefault()
  }

  return (
    <header className="sticky top-0 z-50 w-full px-4 py-4">
      <div className='bg-white/50 backdrop-blur-xl rounded-3xl shadow-sm max-w-7xl mx-auto px-6 py-3 flex items-center justify-between'>
        <Link href="/">
          <div className="text-4xl font-bold flex items-center">
            <h1 className="text-primary-800">E</h1>comm
          </div>
        </Link>

        <form onSubmit={handleSearch} className="flex-1 max-w-md mx-8 bg-white/30 rounded-full">
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
          <Link
            href="/auth"
            className="flex items-center gap-2 glass-card px-4 py-2 bg-white/60 rounded-full"
          >
            <span className="hidden font-medium sm:block">{session?.user ? session?.user.name : "Sign In"}</span>
            <div className="w-8 h-8 rounded-full shadow-lg bg-gray-300 overflow-hidden">
              {session?.user ?<img
                src={session?.user.image}
                alt="User"
                className="w-full h-full object-cover"
                />
                :
                <UserIcon className="h-full w-full p-1 text-gray-500" />
              }
            </div>
          </Link>
        </div>
      </div>

      <div>
      </div>
    </header>
  )
}
