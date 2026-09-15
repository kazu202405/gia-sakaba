import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function StartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
