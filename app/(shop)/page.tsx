import Header from "@/components/layout/Header";
import LandingCarousel from "@/features/products/components/LandingCarousel";
import Category from "@/features/products/components/Category";
import FeatureProducts from "@/features/products/components/FeatureProducts";
import Features from "@/components/marketing/Features";
import CraftBand from "@/components/marketing/CraftBand";
import Testimonies from "@/components/marketing/Testimonies";
import Reveal from "@/components/animations/Reveal";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function Home() {
  return (
    <>
      <Header />
      <Reveal>
        <LandingCarousel />
      </Reveal>
      <Reveal>
        <Category />
      </Reveal>
      <Reveal>
        <FeatureProducts />
      </Reveal>
      <Reveal>
        <CraftBand />
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
