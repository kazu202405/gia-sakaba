import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SmoothScroll } from "@/components/ui/smooth-scroll";
import { ScrollProgress } from "@/components/ui/scroll-progress";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SmoothScroll>
      <ScrollProgress />
      {/* Grain texture overlay */}
      <div className="noise-overlay" aria-hidden="true" />
      <Header />
      <main>{children}</main>
      <Footer />
    </SmoothScroll>
  );
}
