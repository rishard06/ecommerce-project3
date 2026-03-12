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
    <div className="mt-20">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full justify-start border-b border-slate-200 dark:border-slate-800 bg-transparent rounded-none h-auto p-0 mb-8 overflow-x-auto no-scrollbar">
          <TabsTrigger
            value="details"
            className="pb-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent font-bold transition-all px-0 mr-8 text-sm md:text-base"
          >
            Product Details
          </TabsTrigger>
          <TabsTrigger
            value="specifications"
            className="pb-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent font-medium transition-all px-0 mr-8 text-sm md:text-base text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Specifications
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="pb-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent font-medium transition-all px-0 mr-8 text-sm md:text-base text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Reviews ({product.reviewCount.toLocaleString()})
          </TabsTrigger>
          <TabsTrigger
            value="support"
            className="pb-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent font-medium transition-all px-0 text-sm md:text-base text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Support
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Advanced Engineering</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                The {product.name} is forged from aerospace-grade carbon fiber, offering unmatched durability while remaining incredibly light. The internal thermal management system has been redesigned with dual-phase cooling to maintain peak performance during the most demanding tasks.
              </p>
              <ul className="space-y-4">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-primary mt-1 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative aspect-video md:aspect-auto rounded-2xl overflow-hidden shadow-xl min-h-[300px]">
              <Image
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuATqyw17WF5DWTcOPoLug7Lb_Tpl8Y9J-btekSJ_S6GUkmTEKfiZDDOH-6aLLxDND0nBgw-WE8g5dEJh-EBojLGhFs_DhLmJw1sMxxLtIYSmBHrd8oH6QulC5yEegFr-uPxeCtTcU-ccb0RWIwHF-2hcp0hDLAxAJql3skvOJEIA0D9rycM2iVCFY7l3M7YDlx5NcI1XGKjqgxW5N86on2tnrhsJxCNirXls6ZkdY_3yLFRDZIfblql66oj6CyAJhjOIYpJz9kJINZu"
                alt="Engineering detail"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="specifications">
           <div className="p-8 border rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
             <p className="text-slate-500">Full specifications will be listed here.</p>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
