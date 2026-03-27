"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Plus, Heart } from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";
import { useFavoritesStore } from "@/lib/store/favorites-store";
import { motion } from "framer-motion";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function ProductCard({
  id,
  title,
  price,
  image,
  description,
  isPopular,
}: {
  id: string | number;
  title: string;
  price: number;
  image: string;
  description: string;
  isPopular?: boolean;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const { data: session } = useSession();
  const router = useRouter();

  const numericId = typeof id === "string" ? parseInt(id) : id;
  const favorited = isFavorite(numericId);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session) {
      router.push("/login");
      return;
    }

    addItem({
      id: numericId,
      title,
      price,
      image,
    });
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session) {
      router.push("/login");
      return;
    }

    toggleFavorite({
      id: numericId,
      title,
      price,
      image,
      description,
    });
  };

  return (
    <Link href={`/products/${id}`} className="block h-full group">
      <Card className="glass-component h-full flex flex-col justify-between text-center hover:shadow-2xl/40 transition-all duration-500 cursor-pointer overflow-hidden border-white/40 group relative">
        <CardHeader className="p-0 overflow-hidden relative">
          {/* Favorite Toggle */}
          <button
            onClick={handleFavorite}
            className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/40 backdrop-blur-md border border-white/40 hover:cursor-pointer hover:bg-white/60 transition-all active:scale-90 shadow-lg shadow-black/5"
          >
            <motion.div
              initial={false}
              animate={{
                scale: favorited ? [1, 1.2, 1] : 1,
              }}
              transition={{ duration: 0.3 }}
            >
              <Heart
                className="size-5"
                fill={favorited ? "#ff4b4b" : "none"}
                stroke={favorited ? "#ff4b4b" : "#4b5563"} // gray-600 for visibility
              />
            </motion.div>
          </button>

          <div className="w-full h-56 relative overflow-hidden group-hover:scale-105 transition-transform duration-700 ease-out">
            <Image
              src={image}
              alt={title}
              fill
              className="object-contain p-6"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
          </div>
        </CardHeader>
        
        <div className="p-6 pt-2 flex flex-col flex-1">
          <CardTitle className="text-xl font-black text-gray-primary mb-2 line-clamp-1 tracking-tight">
            {title}
          </CardTitle>
          <CardContent className="p-0 flex-1">
            <p className="text-sm font-medium text-gray-tertiary line-clamp-2 leading-relaxed">
              {description}
            </p>
          </CardContent>
          <CardFooter className="p-0 mt-6 flex justify-between items-center">
            <span className="text-2xl text-gray-secondary tracking-tighter">
              ${price.toLocaleString()}
            </span>
            <Button
              size="icon"
              className="size-12 rounded-full cursor-pointer bg-accent-500 hover:bg-accent-600 text-gray-secondary shadow-lg shadow-accent-500/20 active:scale-90 transition-all"
              onClick={handleAddToCart}
            >
              <Plus className="size-6 text-gray-primary" />
            </Button>
          </CardFooter>
        </div>
      </Card>
    </Link>
  );
}
