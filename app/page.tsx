import Header from "../component/Header";
import Category from "../component/Category";
import FeatureProducts from "../component/FeatureProducts";
import Features from "../component/Features";
import Testimonies from "../component/Testimonies";
import Footer from "../component/Footer";

export default async function Home() {
  return (
    <>
      <Header />
      <Category />
      <FeatureProducts />
      <Features />
      <Testimonies />
    </>
  );
}
