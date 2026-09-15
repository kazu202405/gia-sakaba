"use client";

import { useState, useRef, useEffect } from "react";
import { Lock, ArrowRight } from "lucide-react";
import gsap from "gsap";

interface KnowledgeLoginProps {
  onSuccess: () => void;
}

export function KnowledgeLogin({ onSuccess }: KnowledgeLoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
      );
    }, cardRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = () => {
    if (password === "123456") {
      sessionStorage.setItem("knowledge-auth", "true");
      onSuccess();
    } else {
      setError("パスワードが違います");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1f33] px-4">
      <div
        ref={cardRef}
        className="w-full max-w-md rounded-2xl bg-white/[0.05] border border-white/[0.08] p-8 sm:p-10 opacity-0"
      >
        {/* Lock icon */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-[#2d8a80]/20 flex items-center justify-center">
            <Lock className="w-6 h-6 text-[#2d8a80]" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="font-[family-name:var(--font-noto-serif-jp)] text-2xl sm:text-3xl font-semibold text-white text-center mb-2">
          行動科学ナレッジベース
        </h1>

        {/* Subtext */}
        <p className="text-white/60 text-sm text-center mb-8">
          閲覧にはパスワードが必要です
        </p>

        {/* Password input */}
        <div className="mb-4">
          <label htmlFor="knowledge-password" className="sr-only">
            パスワード
          </label>
          <input
            id="knowledge-password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={handleKeyDown}
            placeholder="パスワードを入力"
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-white/30 text-sm outline-none transition-colors duration-200 focus:border-[#2d8a80] focus:ring-1 focus:ring-[#2d8a80]/50"
          />
        </div>

        {/* Error message */}
        {error && (
          <p className="text-red-400 text-sm mb-4 text-center" role="alert">
            {error}
          </p>
        )}

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#2d8a80] hover:bg-[#3aada1] text-white font-semibold text-sm rounded-xl transition-colors duration-200 cursor-pointer"
        >
          ログイン
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
