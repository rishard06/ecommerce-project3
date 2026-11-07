import React from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Music producer",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80",
    quote:
      "These headphones completely changed my studio sessions. The sound is honest in a way I didn't expect at this price.",
  },
  {
    name: "Michael Chen",
    role: "DJ & audio engineer",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80",
    quote:
      "I've tried a lot of brands. This is the rare balance of quality, comfort, and durability that actually holds up on tour.",
  },
  {
    name: "Emily Rodriguez",
    role: "Podcast host",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80",
    quote:
      "The microphone is exceptional. My recordings sound like the room finally got out of the way.",
  },
  {
    name: "Ryman Alex",
    role: "Audio enthusiast",
    image:
      "https://uploadthingy.s3.us-west-1.amazonaws.com/oFohH9YRkkCpeYBgjQJ36k/original-c2466431951d7f3c8f5ac2d6e7a84d5b.webp",
    quote:
      "The best audio gear I've used. I recommend it to anyone who cares how their music feels, not just how it measures.",
  },
];

export default function Testimonies() {
  return (
    <section className="w-full px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-10 text-center md:mb-14">
          <h2 className="mb-3 text-3xl font-semibold tracking-tight text-gray-primary md:text-4xl">
            What customers say
          </h2>
          <p className="mx-auto max-w-2xl text-gray-secondary">
            A few words from people who use this gear every day.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="glass-component h-full text-center">
              <CardHeader className="pt-6">
                <div className="mx-auto mb-4 size-20 overflow-hidden rounded-full bg-white/60 ring-1 ring-white/60">
                  <Image
                    src={testimonial.image}
                    alt=""
                    width={80}
                    height={80}
                    sizes="80px"
                    className="size-full object-cover"
                  />
                </div>
                <CardTitle className="text-base font-semibold tracking-tight text-gray-primary">
                  {testimonial.name}
                </CardTitle>
                <p className="text-sm text-gray-tertiary">{testimonial.role}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-gray-secondary">
                  “{testimonial.quote}”
                </p>
              </CardContent>
              <CardFooter className="justify-center pb-6">
                <div
                  className="flex items-center gap-0.5"
                  role="img"
                  aria-label="Rated 5 out of 5"
                >
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className="size-3.5 text-yellow-500"
                      fill="currentColor"
                      aria-hidden="true"
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
