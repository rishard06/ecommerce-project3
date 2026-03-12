import * as React from 'react';
import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Product } from '../types';

interface ProductTabsProps {
  product: Product;
}

export function ProductTabs({ product }: ProductTabsProps) {
  return (
    <div className="mt-32">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full justify-start bg-accent-500/10 dark:bg-accent-500/5 p-1 rounded-2xl h-auto mb-12 overflow-x-auto no-scrollbar gap-2 inline-flex border border-accent-500/20">
          <TabsTrigger
            value="details"
            className="rounded-full px-8 py-5 my-3 data-[state=active]:bg-accent-500 data-[state=active]:text-gray-secondary data-[state=active]:shadow-lg bg-transparent font-black transition-all text-xs uppercase tracking-widest cursor-pointer text-gray-tertiary hover:text-gray-secondary"
          >
            Product Details
          </TabsTrigger>
          <TabsTrigger
            value="specifications"
            className="rounded-full px-8 py-5 my-3 data-[state=active]:bg-accent-500 data-[state=active]:text-gray-secondary data-[state=active]:shadow-lg bg-transparent font-black transition-all text-xs uppercase tracking-widest cursor-pointer text-gray-tertiary hover:text-gray-secondary"
          >
            Specifications
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="rounded-full px-8 py-5 my-3 data-[state=active]:bg-accent-500 data-[state=active]:text-gray-secondary data-[state=active]:shadow-lg bg-transparent font-black transition-all text-xs uppercase tracking-widest cursor-pointer text-gray-tertiary hover:text-gray-secondary"
          >
            Reviews ({product.reviewCount.toLocaleString()})
          </TabsTrigger>
          <TabsTrigger
            value="support"
            className="rounded-full px-8 py-5 my-3 data-[state=active]:bg-accent-500 data-[state=active]:text-gray-secondary data-[state=active]:shadow-lg bg-transparent font-black transition-all text-xs uppercase tracking-widest cursor-pointer text-gray-tertiary hover:text-gray-secondary"
          >
            Support
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-0 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-gray-primary">Advanced Engineering.</h2>
                <p className="text-xl text-slate-600 dark:text-gray-tertiary leading-relaxed font-medium">
                  The {product.name} is forged from aerospace-grade materials, offering unmatched durability while remaining incredibly light.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {product.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 rounded-2xl glass-component border border-white/40 shadow-lg shadow-black/5">
                    <div className="size-10 rounded-xl bg-accent-500/40 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="size-5 text-accent-700 dark:text-accent-400" />
                    </div>
                    <span className="font-bold text-sm text-slate-700 dark:text-gray-secondary">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden glass-component border border-white/40 shadow-2xl shadow-black/5 group">
              <Image
                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2070&auto=format&fit=crop"
                alt="Engineering detail"
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="specifications" className="outline-none">
           <div className="p-12 rounded-3xl glass-component border border-white/40 shadow-2xl shadow-black/5">
             <h3 className="text-2xl font-black mb-8 text-gray-primary">Technical Specifications</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <div className="flex justify-between py-4 border-b border-slate-200/50 dark:border-gray-quaternary/50">
                  <span className="text-gray-tertiary font-bold">Category</span>
                  <span className="font-black capitalize text-gray-secondary">{product.category}</span>
                </div>
                <div className="flex justify-between py-4 border-b border-slate-200/50 dark:border-gray-quaternary/50">
                  <span className="text-gray-tertiary font-bold">Model</span>
                  <span className="font-black text-gray-secondary">2024 Edition</span>
                </div>
                <div className="flex justify-between py-4 border-b border-slate-200/50 dark:border-gray-quaternary/50">
                  <span className="text-gray-tertiary font-bold">Warranty</span>
                  <span className="font-black text-gray-secondary">24 Months Limited</span>
                </div>
                <div className="flex justify-between py-4 border-b border-slate-200/50 dark:border-gray-quaternary/50">
                  <span className="text-gray-tertiary font-bold">In the Box</span>
                  <span className="font-black text-gray-secondary">Standard Accessories</span>
                </div>
             </div>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
