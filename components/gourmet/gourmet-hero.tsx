"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

export function GourmetHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const animFrameRef = useRef<number>(0);

  // Network canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();

    const nodeCount = Math.min(Math.floor(window.innerWidth / 25), 50);
    const rect = canvas.parentElement!.getBoundingClientRect();
    const nodes: Node[] = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }
    nodesRef.current = nodes;

    const connectionDistance = 150;

    const animate = () => {
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > w) node.vx *= -1;
        if (node.y < 0 || node.y > h) node.vy *= -1;

        node.x = Math.max(0, Math.min(w, node.x));
        node.y = Math.max(0, Math.min(h, node.y));

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251, 191, 36, ${node.opacity})`;
        ctx.fill();
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            const alpha = (1 - dist / connectionDistance) * 0.15;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(251, 191, 36, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // GSAP text entrance
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(
      badgeRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, delay: 0.2 }
    )
      .fromTo(
        headingRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8 },
        "-=0.3"
      )
      .fromTo(
        descRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6 },
        "-=0.4"
      );

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative overflow-hidden bg-gray-900 mt-16 pt-16 pb-20 sm:pt-24 sm:pb-28"
    >
      {/* Network canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_40%,_rgba(251,191,36,0.1),_transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_80%_20%,_rgba(245,158,11,0.08),_transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-900 to-transparent" />
      </div>

      {/* Decorative SVG circles */}
      <svg
        className="absolute top-10 right-[10%] w-64 h-64 opacity-[0.04] pointer-events-none"
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="100" r="80" fill="none" stroke="white" strokeWidth="0.5" />
        <circle cx="100" cy="100" r="60" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
        <circle cx="100" cy="100" r="40" fill="none" stroke="white" strokeWidth="0.5" />
      </svg>

      <svg
        className="absolute bottom-8 left-[5%] w-48 h-48 opacity-[0.03] pointer-events-none"
        viewBox="0 0 200 200"
      >
        <polygon points="100,20 180,180 20,180" fill="none" stroke="white" strokeWidth="0.5" />
        <polygon points="100,50 160,160 40,160" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
      </svg>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div
            ref={badgeRef}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.07] backdrop-blur-sm border border-white/10 mb-8"
            style={{ opacity: 0 }}
          >
            <span className="text-base">✦</span>
            <span className="text-sm text-gray-300">
              紹介制ストーリーコミュニティ
            </span>
          </div>
          <h1
            ref={headingRef}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight leading-[1.15]"
            style={{ opacity: 0, fontFamily: "'Noto Serif JP', serif" }}
          >
            信頼できる人の
            <br />
            紹介だけで、
            <br className="sm:hidden" />
            本当に良いものに出会える世界
          </h1>
          <p
            ref={descRef}
            className="text-lg sm:text-xl text-gray-400 leading-relaxed max-w-2xl"
            style={{ opacity: 0 }}
          >
            ランキングでも、匿名の口コミでもなく。
            <br className="hidden sm:block" />
            「この人が薦めるなら間違いない」
            <br className="hidden sm:block" />
            そんな出会い方が、ここにあります。
          </p>
        </div>
      </div>
    </section>
  );
}
