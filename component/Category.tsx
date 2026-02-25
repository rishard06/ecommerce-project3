import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBagIcon, Watch, Volleyball, Smartphone, ChevronRightIcon } from 'lucide-react';

interface Category {
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const categories: Category[] = [
  {
    name: 'Accessories',
    icon: <ShoppingBagIcon className="h-8 w-8" />,
    color: 'text-purple-700',
    description: '10+ Products',
  },
  {
    name: 'Watches',
    icon: <Watch className="h-8 w-8" />,
    color: 'text-primary-700',
    description: '4+ Products',
  },
  {
    name: 'Sports',
    icon: <Volleyball className="h-8 w-8" />,
    color: 'text-orange-700',
    description: '5+ Products',
  },
  {
    name: 'Smartphones',
    icon: <Smartphone className="h-8 w-8" />,
    color: 'text-green-700',
    description: '3+ Products',
  },
];

export default function Category() {
  return (
    <section className="min-h-screen w-full flex items-center  py-16 px-4 backdrop-blur-sm bg-white/30">
      <div className="w-[80%] mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">
            Shop by Category
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Browse our carefully curated collection of premium audio equipment
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category) => (
            <Link key={category.name} href={`/products?category=${category.name}`} passHref>
              <Card className="glass-component text-center hover:scale-110 transition-all duration-300 cursor-pointer">
                <CardHeader>
                  <div className={`w-16 h-16 rounded-full bg-white/50 mx-auto flex items-center justify-center mb-4 ${category.color}`}>
                    {category.icon}
                  </div>
                  <CardTitle className="text-xl">{category.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-tertiary">{category.description}</p>
                </CardContent>
                <CardFooter className="justify-center">
                  <span className="text-accent-700 flex items-center gap-1">
                    Shop Now <ChevronRightIcon className="h-4 w-4" />
                  </span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}