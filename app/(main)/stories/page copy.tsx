import { Metadata } from "next";
import { GourmetHero } from "@/components/gourmet/gourmet-hero";
import { GourmetProblem } from "@/components/gourmet/gourmet-problem";
import { GourmetConcept } from "@/components/gourmet/gourmet-concept";
import { GourmetHow } from "@/components/gourmet/gourmet-how";
import { GourmetFeatures } from "@/components/gourmet/gourmet-features";
import { GourmetUseCases } from "@/components/gourmet/gourmet-usecases";
import { GourmetCta } from "@/components/gourmet/gourmet-cta";
import { StoriesVideoPlayer } from "@/components/remotion/stories-player";

export const metadata: Metadata = {
  title: "GIA Stories | ガイアの酒場",
  description:
    "信頼できる人の紹介だけで、本当に良いものに出会える世界。ランキングでも匿名の口コミでもなく、「この人が薦めるなら間違いない」そんな出会い方がここにあります。",
};

export default function StoriesPage() {
  return (
    <div className="min-h-screen bg-white">
      <GourmetHero />
      <StoriesVideoPlayer />
      <GourmetProblem />
      <GourmetConcept />
      <GourmetHow />
      <GourmetFeatures />
      <GourmetUseCases />
      <GourmetCta />
    </div>
  );
}
