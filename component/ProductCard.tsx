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
import { Plus } from "lucide-react";

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
  return (
    <Link href={`/products/${id}`} className="block h-full group">
      <Card className="glass-component h-full flex flex-col justify-between text-center hover:shadow-2xl/40 transition-all duration-500 cursor-pointer overflow-hidden border-white/40">
        <CardHeader className="p-0 overflow-hidden">
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
            <Button size="icon" className="size-12 rounded-full cursor-pointer bg-accent-500 hover:bg-accent-600 text-gray-secondary shadow-lg shadow-accent-500/20 active:scale-90 transition-all">
              <Plus className="size-6 text-gray-primary" />
            </Button>
          </CardFooter>
        </div>
      </Card>
    </Link>
  );
}
