import type { Metadata } from "next";
import { Hero } from "@/components/sections/hero";
import { TrustStrip } from "@/components/sections/trust-strip";
import { Challenges } from "@/components/sections/challenges";
import { BehavioralProblem } from "@/components/behavioral/behavioral-problem";
import { BehavioralServices } from "@/components/behavioral/behavioral-services";
import { BehavioralMidCta } from "@/components/behavioral/behavioral-mid-cta";
import { BehavioralCurriculum } from "@/components/behavioral/behavioral-curriculum";
import { WorksStack } from "@/components/sections/works-stack";
import { Testimonials } from "@/components/sections/testimonials";
import { About } from "@/components/sections/about";
import { Seminar } from "@/components/sections/seminar";
import { CampusBanner } from "@/components/sections/campus-banner";
import { Faq } from "@/components/sections/faq";
import { BehavioralCta } from "@/components/behavioral/behavioral-cta";
import { BehavioralDiagnostic } from "@/components/behavioral/behavioral-diagnostic";

export const metadata: Metadata = {
  title: {
    absolute: "GIA | 現場で回る仕組みを、アプリで実装する",
  },
  description:
    "顧客管理・営業支援アプリを、設計から現場運用まで一気通貫で実装。「作って終わり」にしない、伴走型の開発パートナー。",
  alternates: {
    canonical: "/",
  },
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gia2018.com";

function JsonLd() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GIA - Global Information Academy",
    url: siteUrl,
    logo: `${siteUrl}/gia-logo.png`,
    description:
      "現場で回る仕組みを設計し、アプリとして実装する伴走型パートナー",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: "Japanese",
    },
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "仕組み化アプリ開発サービス",
    provider: {
      "@type": "Organization",
      name: "GIA - Global Information Academy",
    },
    description:
      "業務・営業・顧客対応を仕組み化し、顧客管理・営業支援アプリとして実装する伴走型サービス",
    serviceType: "顧客管理・営業支援アプリ開発・業務仕組み化・DX支援",
    areaServed: {
      "@type": "Country",
      name: "Japan",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "JPY",
      description: "無料相談",
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "AIに詳しくなくても相談できますか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "もちろんです。GIAは「何から手をつけていいかわからない」という方のための相談窓口です。AIの知識は不要です。",
        },
      },
      {
        "@type": "Question",
        name: "相談したら必ず契約しないといけませんか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "いいえ。無料相談は「現状の整理」が目的です。相談した結果、自社で対応できそうだと思えばそれで大丈夫です。押し売りは一切しません。",
        },
      },
      {
        "@type": "Question",
        name: "どんな業種・規模に対応していますか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "業務フローが整っていない企業であれば、規模を問わずサポートできます。飲食、建設、商社など、さまざまな業界に対応できます。",
        },
      },
      {
        "@type": "Question",
        name: "費用はどのくらいかかりますか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "一般的なコンサルティングは月額30〜50万円が相場ですが、GIAは仕組み化支援に特化しているため月額5万円〜からご相談いただけます。過去に似たような事例があり、新たに対応すべきことが多くないケースでは、月額3万円程度からご対応させていただいた実績もあります。企業の状況や課題に応じて柔軟に対応しますので、まずはお気軽に無料相談でお聞かせください。",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}

export default function Home() {
  return (
    <>
      <JsonLd />

      {/* AIホットライン：ヒーロー */}
      <Hero />

      {/* 信頼要素ストリップ(Hero直下) */}
      <TrustStrip />

      {/* 悩み共感 */}
      <Challenges />

      {/* 強み（02 Strength × Cross / dark） */}
      <BehavioralProblem />

      {/* 対応できること（04 Service） */}
      <BehavioralServices />

      {/* 支援の流れ（05 Process） */}
      <BehavioralCurriculum />

      {/* AI準備度診断 */}
      <BehavioralDiagnostic />

      {/* 実績（Works） */}
      <WorksStack />

      {/* ビジョン（03 Vision Dark）— やったこと(Works)→なぜやるか(Vision)→声(Testimonials) の真ん中に置く */}
      <About />

      {/* お客様の声 → 中間CTA */}
      <Testimonials />
      <BehavioralMidCta />

      {/* セミナー案内 */}
      <Seminar />

      {/* HIROGARUキャンパス誘導（/campus：創設メンバー募集・メンバー図鑑） */}
      <CampusBanner />

      {/* よくある質問・最終CTA */}
      <Faq />
      <BehavioralCta />
    </>
  );
}
