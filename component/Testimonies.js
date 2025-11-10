import React from 'react';
import Image from 'next/image';
import { Star } from 'lucide-react'; // Import Star from lucide-react
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Removed StarIcon component definition

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Music Producer',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1287&q=80',
    quote: 'These headphones have completely transformed my studio sessions. The sound quality is unmatched!',
  },
  {
    name: 'Michael Chen',
    role: 'DJ & Audio Engineer',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1287&q=80',
    quote: "I've tried many audio brands, but nitec offers the perfect balance of quality, comfort, and durability.",
  },
  {
    name: 'Emily Rodriguez',
    role: 'Podcast Host',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
    quote: 'The microphone quality is exceptional. My podcast recordings have never sounded better!',
  },
  {
      name: 'Ryman Alex',
      role: 'Audio Enthusiast',
      image: 'https://uploadthingy.s3.us-west-1.amazonaws.com/oFohH9YRkkCpeYBgjQJ36k/original-c2466431951d7f3c8f5ac2d6e7a84d5b.webp',
      quote: 'The best audio gear I have ever used! Highly recommended to any audio lover.'
  }
];

export default function Testimonies() {
  return (
    <section className="min-h-screen flex items-center w-full py-16 px-4">
      <div className="max-w-[80%] mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">
            What Our Customers Say
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Don't just take our word for it - hear from our satisfied
            customers
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="glass-component text-center hover:scale-110 transition-all duration-300 cursor-pointer">
              <CardHeader>
                <div className="w-24 h-24 rounded-full bg-white/50 mx-auto flex items-center justify-center mb-4 overflow-hidden">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.name}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardTitle className="text-xl">{testimonial.name}</CardTitle>
                <p className="text-sm text-gray-500">{testimonial.role}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">"{testimonial.quote}"</p>
              </CardContent>
              <CardFooter className="justify-center">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 text-yellow-400"
                      fill="currentColor"
                    />
                  ))}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
