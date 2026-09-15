"use client";

import { useEffect } from "react";

/**
 * ページ内の `.edl-reveal` 要素に IntersectionObserver で `is-in` を付与する。
 * gia-hp-redesign の reveal アニメーションを Next.js 側で再現するためのフック。
 */
export function EdlRevealObserver() {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>(".edl-reveal");
    if (targets.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
