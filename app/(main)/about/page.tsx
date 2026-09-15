import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, MessageCircle, Handshake, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "GIAの酒場について" },
  description:
    "志ある経営者同士が能力と人脈を持ち寄り、課題解決と価値創造を共に行う場。売り込みではなく、共創から始まる経営者サークル。",
};

const benefits = [
  {
    icon: Users,
    title: "紹介制だからこそ生まれる、質の高い人脈",
    description:
      "信頼できる経営者からの紹介のみで構成されるコミュニティ。だからこそ、本音で語り合える関係が築けます。",
  },
  {
    icon: MessageCircle,
    title: "売り込みではなく、課題相談から始まる関係",
    description:
      "名刺交換や営業トークではなく、互いの課題を共有することから関係が始まります。",
  },
  {
    icon: Handshake,
    title: "自然な流れで生まれる、事業提携と共創",
    description:
      "課題と得意が出会うことで、押し付けではない自然な協業が生まれます。",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 bg-gradient-to-b from-slate-900 to-slate-800 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-blue-400 font-medium mb-4 tracking-wider">
            EXECUTIVE CIRCLE
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-8">
            ガイアの酒場
          </h1>
          <p className="text-xl sm:text-2xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
            志ある経営者同士が能力と人脈を持ち寄り、
            <br className="hidden sm:block" />
            課題解決と価値創造を共に行う場
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-8">
              私たちのミッション
            </h2>
            <div className="text-lg sm:text-xl text-slate-600 leading-relaxed space-y-6">
              <p>
                ここは、売り込みの場ではありません。
                <br />
                同じ未来を目指す仲間が集い、
                <br />
                次の挑戦へ向かうための"酒場"です。
              </p>
              <p className="text-slate-500 text-base">
                GIA は、名刺交換の場ではありません。
                <br />
                誰かの課題に、誰かの得意が自然と集まる場です。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 md:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
              入会で得られること
            </h2>
            <p className="text-lg text-slate-500">
              紹介制 × 共創 × 事業提携
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <Card
                key={index}
                className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <CardContent className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-6">
                    <benefit.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 leading-relaxed">
                    {benefit.title}
                  </h3>
                  <p className="text-slate-500 leading-relaxed">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About GIA Section */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative h-[400px] rounded-2xl overflow-hidden">
              <Image
                src="/images/about.jpg"
                alt="GIAについて"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-blue-600 font-medium mb-4">運営会社</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-6">
                株式会社Global Information Academy
              </h2>
              <div className="text-lg text-slate-600 leading-relaxed space-y-4">
                <p>
                  私たちGIAは、「人の力を引き出す」を合言葉に、システム開発と心理学・脳科学の知見を融合させ、仕組みと人の成長の両面からビジネスを支えるDXパートナーです。
                </p>
                <p>
                  単なる仕組みづくりではなく、経営者や現場の声に寄り添い、人の力が最大限に活きる環境をともに築きます。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            仲間になりませんか？
          </h2>
          <p className="text-lg text-slate-300 mb-10 leading-relaxed">
            ガイアの酒場は、紹介制のコミュニティです。
            <br />
            ご興味のある方は、まずはお気軽にお問い合わせください。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            >
              <a href="https://page.line.me/131liqrt" target="_blank" rel="noopener noreferrer">
                LINEで話を聞いてみる
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="border border-white/50 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/members">会員を見る</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
