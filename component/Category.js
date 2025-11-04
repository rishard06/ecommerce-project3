import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const categories = [
  {
    name: 'Headphones',
    icon: <HeadphonesIcon className="h-8 w-8" />,
    color: 'text-primary-700',
    description: '4+ Products',
  },
  {
    name: 'Speakers',
    icon: <SpeakerIcon className="h-8 w-8" />,
    color: 'text-orange-700',
    description: '5+ Products',
  },
  {
    name: 'Microphones',
    icon: <MicIcon className="h-8 w-8" />,
    color: 'text-green-700',
    description: '3+ Products',
  },
  {
    name: 'Accessories',
    icon: <ShoppingBagIcon className="h-8 w-8" />,
    color: 'text-purple-700',
    description: '10+ Products',
  },
];

export default function Category() {
  return (
    <section className="w-full py-16 px-4 backdrop-blur-sm bg-white/30">
      <div className="max-w-[80%] mx-auto">
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
                  <p className="text-sm text-gray-600">{category.description}</p>
                </CardContent>
                <CardFooter className="justify-center">
                  <span className="text-primary-600 flex items-center gap-1 text-base">
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

function HeadphonesIcon(props) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a5 5 0 0 0-5 5v6a5 5 0 0 0 5 5 5 5 0 0 0 5-5V7a5 5 0 0 0-5-5Z" />
        <path d="M7 12v3a5 5 0 0 0 5 5 5 5 0 0 0 5-5v-3" />
        <path d="M17 12h.01" />
        <path d="M7 12h.01" />
      </svg>
    )
  }
  
  
  function SpeakerIcon(props) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
        <circle cx="12" cy="14" r="4" />
        <line x1="12" x2="12.01" y1="6" y2="6" />
      </svg>
    )
  }
  
  
  function MicIcon(props) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    )
  }
  
  
  function ShoppingBagIcon(props) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    )
  }
  
  
  function ChevronRightIcon(props) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    )
  }