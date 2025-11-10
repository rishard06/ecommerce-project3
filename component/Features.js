import React from "react";
import { Star, ShoppingBag, Headphones, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Premium Quality",
    description:
      "All our products are made with high-quality materials for durability and superior sound",
    icon: <Star className="h-8 w-8" />,
    color: "text-primary-700",
  },
  {
    title: "Fast Shipping",
    description:
      "Get your order delivered quickly with our expedited shipping options",
    icon: <ShoppingBag className="h-8 w-8" />,
    color: "text-orange-700",
  },
  {
    title: "24/7 Support",
    description:
      "Our customer support team is available around the clock to assist you",
    icon: <Headphones className="h-8 w-8" />,
    color: "text-green-700",
  },
  {
    title: "30-Day Returns",
    description:
      "Not satisfied? Return your purchase within 30 days for a full refund",
    icon: <CheckCircle className="h-8 w-8" />,
    color: "text-purple-700",
  },
];

export default function Features() {
  return (
    <section className="min-h-screen w-full flex items-center py-16 px-4 backdrop-blur-sm bg-white/30">
      <div className="max-w-[80%] mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Why Choose Us</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We provide the best audio experience with premium quality products
            and exceptional service
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="glass-component text-start hover:scale-110 transition-all duration-300 cursor-pointer"
            >
              <CardHeader>
                <div
                  className={`w-16 h-16 rounded-full bg-white/50 mr-auto flex items-center justify-center mb-4 text-primary-700`}
                >
                  {feature.icon}
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
