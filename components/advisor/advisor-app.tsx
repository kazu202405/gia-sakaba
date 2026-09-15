"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Brain } from "lucide-react";
import gsap from "gsap";
import { AdvisorChat } from "./advisor-chat";

type AdvisorTab = "behavioral" | "x-strategy";

const TAB_TITLES: Record<AdvisorTab, string> = {
  behavioral: "AI行動科学アドバイザー",
  "x-strategy": "AI X攻略アドバイザー",
};

export function AdvisorApp() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<AdvisorTab>("behavioral");

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      tl.fromTo(
        ".advisor-header",
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 }
      ).fromTo(
        ".advisor-content",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 },
        "-=0.3"
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0f1f33] flex flex-col">
      {/* Header */}
      <header className="advisor-header sticky top-0 z-50 bg-[#0f1f33]/80 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: Back Link */}
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 transition-colors"
            aria-label="トップページに戻る"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>

          {/* Center: Title */}
          <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-white/90 tracking-wide whitespace-nowrap">
            {TAB_TITLES[activeTab]}
          </h1>

          {/* Right: Brain Icon */}
          <div aria-hidden="true">
            <Brain className="w-5 h-5 text-[#2d8a80]" />
          </div>
        </div>

        {/* Tab switcher */}
        <div className="max-w-4xl mx-auto px-4 pb-3 flex justify-center gap-3">
          <button
            onClick={() => setActiveTab("behavioral")}
            className={`px-5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 cursor-pointer ${
              activeTab === "behavioral"
                ? "bg-[#2d8a80] text-white shadow-lg shadow-[#2d8a80]/20"
                : "bg-white/[0.05] text-white/70 hover:bg-white/[0.1] hover:text-white"
            }`}
          >
            行動科学
          </button>
          <button
            onClick={() => setActiveTab("x-strategy")}
            className={`px-5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 cursor-pointer ${
              activeTab === "x-strategy"
                ? "bg-[#2d8a80] text-white shadow-lg shadow-[#2d8a80]/20"
                : "bg-white/[0.05] text-white/70 hover:bg-white/[0.1] hover:text-white"
            }`}
          >
            X攻略
          </button>
        </div>
      </header>

      {/* Chat Content */}
      <main className="advisor-content flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <AdvisorChat key={activeTab} variant={activeTab} />
      </main>
    </div>
  );
}
