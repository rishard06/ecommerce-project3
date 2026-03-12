export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  description: string;
  rating: number;
  reviewCount: number;
  images: string[];
  colors?: { name: string; hex: string }[];
  storage?: string[];
  features: string[];
  reviews: Review[];
}

export interface Review {
  id: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  date: string;
  title: string;
  content: string;
  helpfulCount: number;
}
