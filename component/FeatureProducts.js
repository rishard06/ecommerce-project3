import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight as ArrowRightIcon } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const featuredProducts = [
  {
    id: 1,
    name: 'Wireless Headphones',
    price: '$199.99',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1080&auto=format&fit=crop',
    isPopular: true,
    description: 'High-fidelity sound and noise cancellation.',
  },
  {
    id: 2,
    name: 'Bluetooth Speaker',
    price: '$89.99',
    image: 'https://images.unsplash.com/photo-1589003077984-894e133dabab?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1074https://plus.unsplash.com/premium_photo-1664195074956-186ba8cd49d4?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=686',
    isPopular: false,
    description: 'Portable and waterproof for any adventure.',
  },
  {
    id: 3,
    name: 'Studio Microphone',
    price: '$129.99',
    image: 'https://images.unsplash.com/photo-1608024472541-676ad5cd69e7?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8U3R1ZGlvJTIwTWljcm9waG9uZXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&q=60&w=500',
    isPopular: true,
    description: 'Crystal clear audio for recording and live performances.',
  },
    {
    id: 4,
    name: 'Gaming Headset',
    price: '$149.99',
    image: 'https://images.unsplash.com/photo-1629429407756-4a7703614972?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Z2FtaW5nJTIwaGVhZHNldHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&q=60&w=500',
    isPopular: true,
    description: 'Immersive sound for the ultimate gaming experience.',
  },
];

function ProductCard({ id, name, price, image, isPopular, description }) {
  return (
    <Card className="glass-component min-w-max-[300px] text-center hover:shadow-2xl/45 transition-all duration-300 cursor-pointer group">
      <CardHeader>
        <div className="w-full h-48 mx-auto mb-4 overflow-hidden rounded-t-3xl">
          <Image
            src={image}
            alt={name}
            width={300}
            height={300}
            className="w-full h-full object-cover group-hover:scale-120 transition-all duration-300 cursor-pointer"
          />
        </div>
        <CardTitle className="text-xl">{name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">{description}</p>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <span className="font-bold text-lg">{price}</span>
        <Button className="rounded-full cursor-pointer hover:bg-primary-700">Add to Cart</Button>
      </CardFooter>
    </Card>
  );
}

export default function FeatureProducts() {
  return (
    <section className="min-h-screen w-full flex items-center py-16 px-4">
      <div className="max-w-[80%] mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10">
          <div>
            <h2 className="text-3xl font-bold mb-2">
              Featured Products
            </h2>
            <p className="text-gray-600">Our most popular audio equipment</p>
          </div>
          <Link
            href="/products"
            className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            View All <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard
              key={product.id}
              {...product}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
