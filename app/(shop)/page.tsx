import Header from "@/components/layout/Header";
import Category from "@/features/products/components/Category";
import FeatureProducts from "@/features/products/components/FeatureProducts";
import Features from "@/components/marketing/Features";
import Testimonies from "@/components/marketing/Testimonies";
import Reveal from "@/components/animations/Reveal";

export default async function Home() {
  return (
    <>
      <Header />
      <Reveal>
        <Category />
      </Reveal>
      <Reveal>
        <FeatureProducts />
      </Reveal>
      <Reveal>
        <Features />
      </Reveal>
      <Reveal>
        <Testimonies />
      </Reveal>
    </>
  );
}
