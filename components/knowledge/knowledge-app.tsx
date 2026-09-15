"use client";

import { useState, useEffect } from "react";
import { KnowledgeLogin } from "./knowledge-login";
import { KnowledgeEffects } from "./knowledge-effects";
import { KnowledgeCurriculum } from "./knowledge-curriculum";
import { KnowledgeXStrategy } from "./knowledge-x-strategy";
import Link from "next/link";
import { ArrowLeft, Brain, MessageCircle } from "lucide-react";

type KnowledgeTab = "behavioral" | "x-strategy";

export function KnowledgeApp() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<KnowledgeTab>("behavioral");

  useEffect(() => {
    const auth = sessionStorage.getItem("knowledge-auth");
    if (auth === "true") {
      setAuthenticated(true);
    }
    setChecking(false);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0f1f33] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2d8a80] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return <KnowledgeLogin onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#0f1f33]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f1f33]/80 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>

          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-[#2d8a80]" />
            <h1 className="font-[family-name:var(--font-noto-serif-jp)] text-base sm:text-lg font-semibold text-white">
              ナレッジベース
            </h1>
          </div>

          <Link
            href="/advisor"
            className="flex items-center gap-2 text-[#2d8a80] hover:text-[#3aada1] transition-colors text-sm"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">AIアドバイザー</span>
          </Link>
        </div>
      </header>

      {/* Tab switcher */}
      <div className="sticky top-16 z-40 bg-[#0f1f33]/80 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-center gap-3">
          <button
            onClick={() => setActiveTab("behavioral")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer ${
              activeTab === "behavioral"
                ? "bg-[#2d8a80] text-white shadow-lg shadow-[#2d8a80]/20"
                : "bg-white/[0.05] text-white/70 hover:bg-white/[0.1] hover:text-white"
            }`}
          >
            行動科学
          </button>
          <button
            onClick={() => setActiveTab("x-strategy")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer ${
              activeTab === "x-strategy"
                ? "bg-[#2d8a80] text-white shadow-lg shadow-[#2d8a80]/20"
                : "bg-white/[0.05] text-white/70 hover:bg-white/[0.1] hover:text-white"
            }`}
          >
            X攻略
          </button>
        </div>
      </div>

      {/* Content */}
      <main>
        {activeTab === "behavioral" ? (
          <>
            <KnowledgeEffects />
            <KnowledgeCurriculum />
          </>
        ) : (
          <KnowledgeXStrategy />
        )}
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-white/[0.08]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-white/30 text-sm">
            {activeTab === "behavioral"
              ? "本コンテンツは行動科学の研究に基づいています。"
              : "本コンテンツはX（Twitter）の公開アルゴリズムおよびSNSマーケティング研究に基づいています。"}
          </p>
        </div>
      </footer>
    </div>
  );
}
