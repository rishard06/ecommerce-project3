import AnnouncementBar from "@/components/layout/AnnouncementBar";
import NavBar from "@/components/layout/NavBar";
import Footer from "@/components/layout/Footer";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AnnouncementBar />
      <NavBar />
      {children}
      <Footer />
    </>
  );
}
