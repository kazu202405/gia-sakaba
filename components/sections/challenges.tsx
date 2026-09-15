"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Challenges — Editorial 課題提起
 * オフホワイト中央寄せ：金線マーカー → "Challenge" lead → 明朝h2 →
 * チェックリスト → 締めの一文。
 */
const challenges = [
  "担当者が辞めたら、回らなくなる仕組みになっている",
  "営業の \"勝ちパターン\" が個人技で、再現できない",
  "ツールは導入したが、誰も日常的に使っていない",
];

export function Challenges() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(
          [
            ".challenge-line",
            ".challenge-label",
            ".challenge-heading",
            ".challenge-highlight",
            ".challenge-item",
            ".challenge-check",
            ".challenge-closing",
          ],
          { clearProps: "all" },
        );
        return;
      }

      const media = gsap.matchMedia();

      media.add("(min-width: 768px)", () => {
        const timeline = gsap.timeline({
          defaults: { ease: "power2.out" },
          scrollTrigger: {
            trigger: section,
            start: "top 72%",
            end: "bottom 34%",
            scrub: 0.65,
          },
        });

        timeline
          .fromTo(
            ".challenge-line",
            { scaleY: 0, transformOrigin: "top center" },
            { scaleY: 1, duration: 0.6, ease: "none" },
            0,
          )
          .fromTo(
            ".challenge-label",
            { autoAlpha: 0, y: 10, letterSpacing: "0.48em" },
            { autoAlpha: 1, y: 0, letterSpacing: "0.32em", duration: 0.45 },
            0.14,
          )
          .fromTo(
            ".challenge-heading",
            { autoAlpha: 0, y: 34 },
            { autoAlpha: 1, y: 0, duration: 0.7 },
            0.34,
          )
          .fromTo(
            ".challenge-highlight",
            { scaleX: 0, transformOrigin: "left center" },
            { scaleX: 1, duration: 0.65 },
            0.62,
          )
          .fromTo(
            ".challenge-item",
            {
              autoAlpha: 0,
              x: (index) => (index % 2 === 0 ? -32 : 32),
            },
            { autoAlpha: 1, x: 0, duration: 0.55, stagger: 0.24 },
            0.82,
          )
          .fromTo(
            ".challenge-check",
            { autoAlpha: 0, scale: 0, rotation: -45 },
            {
              autoAlpha: 1,
              scale: 1,
              rotation: 0,
              duration: 0.35,
              stagger: 0.24,
            },
            0.88,
          )
          .fromTo(
            ".challenge-closing",
            { autoAlpha: 0, y: 18 },
            { autoAlpha: 1, y: 0, duration: 0.55 },
            1.58,
          );

        return () => timeline.kill();
      });

      media.add("(max-width: 767px)", () => {
        const timeline = gsap.timeline({
          defaults: { ease: "power2.out" },
          scrollTrigger: {
            trigger: section,
            start: "top 78%",
            toggleActions: "play none none none",
          },
        });

        timeline
          .fromTo(
            ".challenge-line",
            { scaleY: 0, transformOrigin: "top center" },
            { scaleY: 1, duration: 0.45 },
          )
          .fromTo(
            ".challenge-label",
            { autoAlpha: 0, y: 8 },
            { autoAlpha: 1, y: 0, duration: 0.35 },
            "-=0.2",
          )
          .fromTo(
            ".challenge-heading",
            { autoAlpha: 0, y: 24 },
            { autoAlpha: 1, y: 0, duration: 0.55 },
            "-=0.12",
          )
          .fromTo(
            ".challenge-highlight",
            { scaleX: 0, transformOrigin: "left center" },
            { scaleX: 1, duration: 0.45 },
            "-=0.28",
          )
          .fromTo(
            ".challenge-item",
            { autoAlpha: 0, x: -18 },
            { autoAlpha: 1, x: 0, duration: 0.42, stagger: 0.13 },
            "-=0.1",
          )
          .fromTo(
            ".challenge-check",
            { autoAlpha: 0, scale: 0 },
            { autoAlpha: 1, scale: 1, duration: 0.25, stagger: 0.13 },
            "-=0.55",
          )
          .fromTo(
            ".challenge-closing",
            { autoAlpha: 0, y: 14 },
            { autoAlpha: 1, y: 0, duration: 0.45 },
            "-=0.08",
          );

        return () => timeline.kill();
      });

      return () => media.revert();
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="edl-root bg-[var(--edl-off-white)] px-6 py-28 text-center md:min-h-[135vh] md:px-16 md:py-0"
    >
      <div className="mx-auto max-w-[880px] md:sticky md:top-[6vh] md:flex md:min-h-[88vh] md:flex-col md:justify-center md:py-8">
        <span
          aria-hidden
          className="challenge-line mb-8 inline-block h-14 w-px bg-[var(--edl-gold)]"
        />
        <span
          className="challenge-label mb-7 block font-[family-name:var(--font-en)] text-xs uppercase tracking-[0.32em] text-[var(--edl-gold)]"
        >
          Challenge
        </span>
        <h2
          className="challenge-heading edl-jp-keep font-[family-name:var(--font-mincho)] font-semibold leading-[1.55] tracking-[0.04em] text-[var(--edl-navy)]"
          style={{ fontSize: "clamp(30px, 4vw, 56px)" }}
        >
          業務も営業も、
          <br />
          <span className="relative inline-block">
            属人化
            <span
              aria-hidden
              className="challenge-highlight absolute bottom-1 left-0 right-0 -z-10 h-2.5 bg-[var(--edl-gold)] opacity-30"
            />
          </span>
          していませんか？
        </h2>

        <ul
          className="mx-auto mb-8 mt-16 max-w-[640px] list-none text-left"
        >
          {challenges.map((line, i) => (
            <li
              key={line}
              className={`challenge-item relative py-5 pl-9 text-[16px] leading-[1.7] text-[var(--edl-body)] ${
                i < challenges.length - 1
                  ? "border-b border-[var(--edl-line)]"
                  : ""
              }`}
            >
              <span className="challenge-check absolute left-0 top-5 font-[family-name:var(--font-en)] font-semibold text-[var(--edl-gold)]">
                ✓
              </span>
              {line}
            </li>
          ))}
        </ul>

        <p
          className="challenge-closing edl-jp-keep mt-6 font-[family-name:var(--font-mincho)] text-[17px] tracking-[0.04em] text-[var(--edl-muted)]"
        >
          ── そのままでは、人が &quot;やらなくていいこと&quot;
          に時間を奪われ続けます。
        </p>
      </div>
    </section>
  );
}
