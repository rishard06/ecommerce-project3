import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ProductGallery } from './components/ProductGallery';
import { ProductInfo } from './components/ProductInfo';
import { ProductTabs } from './components/ProductTabs';
import { CustomerReviews } from './components/CustomerReviews';
import { RelatedProducts } from './components/RelatedProducts';
import { Product, Review } from './types';

const MOCK_REVIEWS: Review[] = [
  {
    id: 'r1',
    userName: 'Marcus Chen',
    userAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTZEY8JBtIaz5IHdUzQDCVwoczC9UHVNE_E5Dvd8m1sRDCHwp4zqU1lZpfBhyarv57oI2tGGm62CrmQNYNP0GWPde6dYed_TY1dkAPteAyPa1-aao7FrGSLYtaufZ1zfBh7M-oL4tsHr01ZnUxfSQffNdxThB0sLBkDuqX642mrqBsvJXw8SN-KoJFa499sIjbEbvuYYo5sRoyjwDP2R8d_JE8Nz3aj_rnrsiju4xdO6QfT7hv5q1VWE2OPyiwLdrv4hx77oLdLn3b',
    rating: 5,
    date: '2 days ago',
    title: "Best laptop I've ever owned.",
    content: "The build quality is incredible. As a video editor, the export speeds are mind-blowing. The screen is so bright I can work outdoors without any issues. Definitely worth the investment.",
    helpfulCount: 124
  },
  {
    id: 'r2',
    userName: 'Sarah Jenkins',
    userAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZ59V6wG7pUVoo7wskJwOzSJf4ZoL09pTDVJDx2h3--DAJxw6zy-C-056iRN3etmfQebv4tS7JyCZRlkuGigfgHKun4CD7xp3v9wye0LixmHW_jA6QmAmY4ri1LoqDWI9uhLUdF3Fqwlxata-t8mzPkNTPtVrRAH3ZsAgBm_NnuW9rG7ho5DIF4ThXcC4VNH1NvBk-T5SJRL5HHj715L_L7Wi1U_lB5d1T3y8XGdW-S0R0IHzf0w2yzE9J5I8pHspje5hIIjnwd2ks',
    rating: 5,
    date: '1 week ago',
    title: "Incredible Display",
    content: "The ProMotion display makes everything feel so smooth. I was hesitant about the price, but after using it for a week, I can't go back. The battery life actually lasts a full workday of coding.",
    helpfulCount: 89
  }
];

const MOCK_RELATED: Partial<Product>[] = [
  { name: 'Zenith Air 13', price: 1299, images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuBEjzfkXR3rMTer8Fw7lfGgQ3Qhkr2lrP5AedaGShSqBNeoZ5zchCbNmPQMwGe_nBX7IRGNhEcnW7ar5Eh8MJrU-bP-zUXdsX47b9CGBPMZ8WlXefFUgtO5DtNu0QQnwvI90yl8Zl_Wmh4pYax6FWhR5NE-S1G1KeiAiTCSJgfj1tVTSEFJjSjtWy2OcGpb0hR17asEL6EBqNF45Ia3XpPuOjoWQPdUJFtmlo6_BeLhZoACH2eQigKvvNls63tNfSveyYW-q09lDnA7'] },
  { name: 'Apex Pro Keyboard', price: 199, images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuCi3v73sQsTGCXduORpyde-rYjQQ4bMSXO63mAJCCdTYfrG274uXaVG94vS0wzsGUjhheGowQBjxL2Flcqdzz61j_QM7r3Z_X1iLGZMFJ3Vd8o5XSEP8hT9oC3uSg5vvBkjwye9Qmj8eZvMgA2788227GJ4xEgd79kEvtCTWV9-HPePqypXtw5bPa61lC2J9bk4UbB2D_DRVReN1Pj8Y6CryryKyyu0_trCt6HeryQ8CtRqyIde78z1LuKHw_x1M0TOsJxA839PFDY9'] },
  { name: 'Sonic Pro Wireless', price: 349, images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuBj6MQB-RNfp_PXguXxLzqwRx-feOoZdFlVp5SCzIclqXgyVlLIsvUSC4U-DDQz159cofPB_kdI0XV1JrerfVaZFOV4FLEHFz8I4LcaaN1lWmf847jxsdKpfZel0-4S4guz-HxtkTzfiICuStqfUdUe7y2QHuKb8HGL-0S09gAsAJZ1U9qtkVTaPjiMOkS33xX9g0IMbz0jt2WhSt9Lgqe4GOKf5K_ufXgQ81CO7KYkObYrYAXVxU1-kF2bY0l9meqTEFfJZIlgY7vN'] },
  { name: 'Studio Mouse S1', price: 99, images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuDzL8oBhp0C8VZcnv_N76kC-kX03bzy-0SOJkqUg3fPVdqwVe41hjpBEddtUaDUIkJCFl1uMZ4KRqcShUJv_x0mohIqUUxf4hNDx821vY4y2m0OjMWCYBt2__EEwpyhyj8rnLucj_lyFbfBUvCAWDfUR7uQ9osmKdAYqMioD7o1T2KFRNKd8tZOq-YdkR4Jc2-Z6FawmD5dXW9aWvX_vrNLkkt1BWJBL8ONepl33BXcx7BWguhOX5CGH82zwl2vYDDs_JP1_9cpuUyv'] }
];

interface ProductDetailPageProps {
  product: Product;
}

export function ProductDetailPage({ product }: ProductDetailPageProps) {
  return (
    <main className="flex-1 max-w-[1280px] mx-auto w-full px-6 lg:px-10 py-8 font-display">
      <nav className="flex items-center gap-2 mb-8 text-sm font-medium">
        <Link href="/" className="text-slate-500 hover:text-primary transition-colors">Home</Link>
        <ChevronRight className="size-4 text-slate-400" />
        <Link href={`/products?category=${product.category}&skip=0`} className="text-slate-500 hover:text-primary transition-colors capitalize">{product.category}</Link>
        <ChevronRight className="size-4 text-slate-400" />
        <span className="text-slate-900 dark:text-slate-100">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7">
          <ProductGallery images={product.images} />
        </div>
        <div className="lg:col-span-5">
          <ProductInfo product={product} />
        </div>
      </div>

      <ProductTabs product={product} />
      
      <CustomerReviews 
        reviews={MOCK_REVIEWS} 
        rating={product.rating} 
        totalReviews={product.reviewCount} 
      />

      <RelatedProducts products={MOCK_RELATED} />
    </main>
  );
}
