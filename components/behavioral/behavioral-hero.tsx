"use client";

import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function BehavioralHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Canvas neural network background
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    let animationId: number;
    let nodes: { x: number; y: number; vx: number; vy: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx2d.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const initNodes = () => {
      const count = Math.min(60, Math.floor((canvas.offsetWidth * canvas.offsetHeight) / 15000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
      }));
    };

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx2d.clearRect(0, 0, w, h);

      // Move nodes
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > w) node.vx *= -1;
        if (node.y < 0 || node.y > h) node.vy *= -1;
      }

      // Draw connections
      const maxDist = 150;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.15;
            ctx2d.strokeStyle = `rgba(45, 138, 128, ${alpha})`;
            ctx2d.lineWidth = 0.8;
            ctx2d.beginPath();
            ctx2d.moveTo(nodes[i].x, nodes[i].y);
            ctx2d.lineTo(nodes[j].x, nodes[j].y);
            ctx2d.stroke();
          }
        }
      }

      // Draw nodes
      for (const node of nodes) {
        ctx2d.fillStyle = "rgba(45, 138, 128, 0.3)";
        ctx2d.beginPath();
        ctx2d.arc(node.x, node.y, 2, 0, Math.PI * 2);
        ctx2d.fill();
      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    initNodes();
    draw();
    window.addEventListener("resize", () => {
      resize();
      initNodes();
    });

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      tl.fromTo(
        ".bh-badge",
        { y: 30, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.8 }
      )
        .fromTo(
          ".bh-h1-line",
          { y: 80, opacity: 0, rotateX: 20 },
          { y: 0, opacity: 1, rotateX: 0, duration: 0.9, stagger: 0.15 },
          "-=0.5"
        )
        .fromTo(
          ".bh-sub",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 },
          "-=0.4"
        )
        .fromTo(
          ".bh-cta-wrapper",
          { y: 30, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 0.6 },
          "-=0.2"
        )
        .fromTo(
          ".bh-scroll-hint",
          { opacity: 0 },
          { opacity: 1, duration: 1 },
          "-=0.2"
        );

      // Floating blob animations
      gsap.to(".bh-blob-1", {
        y: -35,
        x: 20,
        duration: 7,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".bh-blob-2", {
        y: 30,
        x: -25,
        duration: 9,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      // Parallax on scroll
      gsap.to(".bh-content", {
        y: -80,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0f1f33]"
    >
      {/* Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-[1]"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f1f33]/30 via-transparent to-[#0f1f33]/60 z-[2]" />

      {/* Animated gradient blobs */}
      <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
        <div className="bh-blob-1 absolute top-[15%] left-[15%] w-[min(500px,50vw)] h-[min(500px,50vw)] rounded-full bg-[#2d8a80]/15 blur-[100px]" />
        <div className="bh-blob-2 absolute bottom-[20%] right-[15%] w-[min(400px,45vw)] h-[min(400px,45vw)] rounded-full bg-[#c8a55a]/10 blur-[80px]" />
      </div>

      {/* Content */}
      <div className="bh-content relative z-[4] max-w-4xl mx-auto px-4 text-center pt-16">
        <span className="bh-badge inline-block text-sm font-semibold tracking-[0.2em] mb-8 rounded-full px-6 py-2.5 bg-white/[0.08] backdrop-blur-md border border-white/[0.12] text-white/90">
          Behavioral Design
        </span>

        <h1 className="font-[family-name:var(--font-noto-serif-jp)] text-4xl sm:text-5xl md:text-7xl font-semibold text-white leading-[1.1] mb-8 tracking-tight [perspective:1000px]">
          <span className="bh-h1-line block">行動科学で、</span>
          <span className="bh-h1-line block mt-2">
            経営の
            <span className="text-[#2d8a80]">解像度</span>
            を上げる。
          </span>
        </h1>

        <p className="bh-sub text-lg sm:text-xl text-white/70 font-normal leading-relaxed mb-12 max-w-2xl mx-auto">
          人は「正しいこと」では動かない。
          <br className="hidden sm:block" />
          行動科学に基づく仕組みで、組織の行動を自然に変える。
        </p>

        <div className="bh-cta-wrapper relative inline-block">
          <div className="absolute inset-0 rounded-full bg-[#2d8a80]/30 animate-[pulse-ring_2.5s_ease-out_infinite]" />
          <a
            href="/diagnostic"
            className="btn-glow group relative inline-flex items-center gap-3 px-10 py-5 bg-[#2d8a80] text-white font-bold text-lg rounded-full hover:bg-[#247a70] transition-all duration-300 shadow-2xl hover:shadow-[0_20px_60px_rgba(45,138,128,0.3)] hover:-translate-y-1"
          >
            まずは3分の無料診断から
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="bh-scroll-hint absolute bottom-10 left-1/2 -translate-x-1/2 z-[5] flex flex-col items-center gap-3">
        <span className="text-[10px] text-white/40 tracking-[0.3em] uppercase font-medium">
          Scroll
        </span>
        <div className="w-[1px] h-10 bg-white/10 relative overflow-hidden rounded-full">
          <div
            className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-white/60 to-transparent"
            style={{ animation: "scroll-line 2s ease-in-out infinite" }}
          />
        </div>
      </div>

      {/* Wave Divider */}
      <div className="absolute bottom-0 left-0 right-0 h-[120px] overflow-hidden z-[5]">
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <path
            d="M0,80 C240,120 480,40 720,80 C960,120 1200,40 1440,80 L1440,120 L0,120 Z"
            fill="#f8f7f5"
          />
        </svg>
      </div>
    </section>
  );
}
