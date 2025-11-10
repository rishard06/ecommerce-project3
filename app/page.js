import Image from "next/image";
import { auth } from "../lib/auth"; // path to your Better Auth server instance
import { headers } from "next/headers";
import Header from "../component/Header";
import Category from "../component/Category";
import FeatureProducts from "../component/FeatureProducts";
import Features from "../component/Features";
import Testimonies from "../component/Testimonies";
import Footer from "../component/Footer";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(), // you need to pass the headers object.
  });

  return (
    <>
      <Header session={session} />
      <Category />
      <FeatureProducts />
      <Features />
      <Testimonies />
      <Footer />
    </>
  );
}
