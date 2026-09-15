"use client";

import { useState, useEffect } from "react";
import { KnowledgeLogin } from "./knowledge-login";
import { KnowledgeEffects } from "./knowledge-effects";
import { KnowledgeCurriculum } from "./knowledge-curriculum";
import { Brain } from "lucide-react";

export function BehavioralScienceApp() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

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
      {/* Page title */}
      <div className="pt-24 pb-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <Brain className="w-5 h-5 text-[#2d8a80]" />
          <h1 className="font-[family-name:var(--font-noto-serif-jp)] text-base sm:text-lg font-semibold text-white">
            行動科学 効果辞典
          </h1>
        </div>
      </div>

      {/* Content */}
      <main>
        <KnowledgeEffects />
        <KnowledgeCurriculum />
      </main>
    </div>
  );
}
