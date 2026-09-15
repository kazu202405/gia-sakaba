"use client";

import { useEffect, useRef, useCallback } from "react";

interface ParticleNetworkProps {
  className?: string;
  /** Node color in rgba format */
  nodeColor?: string;
  /** Connection line color in rgba format */
  lineColor?: string;
  /** Maximum connection distance between nodes */
  maxDistance?: number;
  /** Base node count (auto-scaled by viewport area) */
  baseCount?: number;
  /** Node speed multiplier */
  speed?: number;
  /** Node radius */
  nodeRadius?: number;
  /** Max line alpha (0-1) */
  lineAlpha?: number;
}

export function ParticleNetwork({
  className = "",
  nodeColor = "rgba(45, 138, 128, 0.3)",
  lineColor = "45, 138, 128",
  maxDistance = 150,
  baseCount = 60,
  speed = 0.4,
  nodeRadius = 2,
  lineAlpha = 0.15,
}: ParticleNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<{ x: number; y: number; vx: number; vy: number }[]>(
    []
  );
  const animationRef = useRef<number>(0);
  const reducedMotion = useRef(false);

  const initNodes = useCallback(
    (w: number, h: number) => {
      const area = w * h;
      let count = Math.min(baseCount, Math.floor(area / 15000));
      // Mobile: reduce by 50%
      if (w < 768) count = Math.floor(count * 0.5);
      nodesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
      }));
    },
    [baseCount, speed]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check reduced motion preference
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = mq.matches;
    const handleMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion.current = e.matches;
    };
    mq.addEventListener("change", handleMotionChange);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initNodes(w, h);
    };

    const draw = () => {
      if (reducedMotion.current) {
        // Draw static frame only once
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        ctx.clearRect(0, 0, w, h);
        const nodes = nodesRef.current;
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < maxDistance) {
              const alpha = (1 - dist / maxDistance) * lineAlpha;
              ctx.strokeStyle = `rgba(${lineColor}, ${alpha})`;
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.moveTo(nodes[i].x, nodes[i].y);
              ctx.lineTo(nodes[j].x, nodes[j].y);
              ctx.stroke();
            }
          }
        }
        for (const node of nodes) {
          ctx.fillStyle = nodeColor;
          ctx.beginPath();
          ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }

      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      const nodes = nodesRef.current;

      // Move nodes
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > w) node.vx *= -1;
        if (node.y < 0 || node.y > h) node.vy *= -1;
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * lineAlpha;
            ctx.strokeStyle = `rgba(${lineColor}, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const node of nodes) {
        ctx.fillStyle = nodeColor;
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    resize();
    draw();

    const handleResize = () => {
      resize();
      if (reducedMotion.current) draw();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
      mq.removeEventListener("change", handleMotionChange);
    };
  }, [initNodes, maxDistance, lineAlpha, lineColor, nodeColor, nodeRadius]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      aria-hidden="true"
    />
  );
}
