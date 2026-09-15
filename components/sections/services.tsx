"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const services = [
  {
    title: "DX・システム開発",
    description: "業務を整理し、ムダや属人化をなくす。\nホームページ制作からWebアプリ開発、自動化・AI活用まで、仕組み化することで人にしかできない価値を最大化します。",
    image: "/images/services/dx-system.jpg",
    href: null,
  },
  {
    title: "空間・建築デザイン",
    description: "そこにいる人の心地よさを大切にした空間づくり。\n内装・店舗設計・レジン造作まで、人の感情や動きに寄り添い、記憶に残る体験をデザインします。",
    image: "/images/services/space-design.jpg",
    href: "/services/space",
  },
  {
    title: "伴走支援・コンサルティング",
    description: "人の感情や心理に寄り添い、対話を通じて組織の力を引き出す。\n業務改善から研修まで、自ら動ける組織づくりを支援します。",
    image: "/images/services/consulting.jpg",
    href: null,
  },
];

export function Services() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // ヘッダーのフェードイン
      gsap.fromTo(
        ".services-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".services-header",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      // カードのスタガーフェードイン
      gsap.fromTo(
        ".service-card",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
          stagger: 0.05,
          scrollTrigger: {
            trigger: ".services-grid",
            start: "top 95%",
            toggleActions: "play none none none",
          },
        }
      );
    }, containerRef);

    ScrollTrigger.refresh(true);

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <section ref={containerRef} id="services" className="py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="services-header text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            私たちのサービス
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed">
            人の想いや心理を大切にしながら、<br />
            人・仕組み・空間を整え、ビジネスが自然に成長する環境をデザインします。
          </p>
        </div>

        {/* Cards */}
        <div className="services-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const cardContent = (
              <Card
                className={`service-card overflow-hidden transition-all duration-300 shadow-lg hover:-translate-y-2 hover:shadow-2xl h-full ${
                  service.href ? "cursor-pointer" : ""
                }`}
              >
                {/* 画像コンテナ - overflow:hidden で画像ズームを枠内に */}
                <div className="relative h-[220px] overflow-hidden">
                  <Image
                    src={service.image}
                    alt={service.title.replace("\n", " ")}
                    fill
                    className="object-cover transition-transform duration-500 ease-out hover:scale-110"
                  />
                </div>
                <CardContent className="p-8 text-center">
                  <h3 className="text-xl font-bold text-slate-800 mb-4 whitespace-pre-line">
                    {service.title}
                  </h3>
                  <p className="text-base text-slate-500 leading-relaxed whitespace-pre-line">
                    {service.description}
                  </p>
                </CardContent>
              </Card>
            );

            return service.href ? (
              <Link key={index} href={service.href} className="block service-card-wrapper">
                {cardContent}
              </Link>
            ) : (
              <div key={index} className="service-card-wrapper">{cardContent}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
