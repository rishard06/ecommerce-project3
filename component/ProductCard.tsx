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
}: {
  id: number;
  title: string;
  price: number;
  image: string;
  isPopular: boolean;
  description: string;
}) {
  return (
    <Card className="glass-component min-w-max-[300px] flex flex-col justify-between text-center hover:shadow-2xl/45 transition-all duration-300 cursor-pointer group">
      <CardHeader>
        <div className="w-full h-48 mx-auto mb-4 overflow-hidden rounded-t-3xl">
          <Image
            src={image}
            alt={title}
            width={300}
            height={300}
            className="w-full h-full object-cover group-hover:scale-120 transition-all duration-300 cursor-pointer"
          />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <span className="font-medium text-xl">{price} $</span>
        <Link href={`/shop/details/${id}`}>
          <Button className="rounded-full h-12 w-12 cursor-pointer bg-accent-500 px-4  hover:bg-accent-600 text-gray-secondary">
            <Plus className="text-gray-primary size-6" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
