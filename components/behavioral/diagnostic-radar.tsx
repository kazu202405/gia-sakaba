"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export interface DomainScore {
  label: string;
  score: number;
  angle: number;
}

interface DiagnosticRadarProps {
  domains: DomainScore[];
  animated?: boolean;
  size?: number;
}

export function DiagnosticRadar({
  domains,
  animated = true,
  size = 360,
}: DiagnosticRadarProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !animated) return;

    const area = svgRef.current.querySelector(".radar-data-area");
    const dots = svgRef.current.querySelectorAll(".radar-dot");
    const labels = svgRef.current.querySelectorAll(".radar-label");
    const scoreLabels = svgRef.current.querySelectorAll(".radar-score-label");

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

    tl.fromTo(
      area,
      { opacity: 0, scale: 0, transformOrigin: "center center" },
      { opacity: 1, scale: 1, duration: 1 }
    )
      .fromTo(
        dots,
        { opacity: 0, scale: 0, transformOrigin: "center center" },
        { opacity: 1, scale: 1, duration: 0.5, stagger: 0.08 },
        "-=0.5"
      )
      .fromTo(
        labels,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.06 },
        "-=0.3"
      )
      .fromTo(
        scoreLabels,
        { opacity: 0, scale: 0.5 },
        { opacity: 1, scale: 1, duration: 0.4, stagger: 0.06 },
        "-=0.2"
      );

    return () => {
      tl.kill();
    };
  }, [animated, domains]);

  const center = size / 2;
  const maxRadius = size * 0.28;
  const levels = [0.25, 0.5, 0.75, 1];

  const getPoint = (angle: number, radius: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  const dataPoints = domains.map((d) =>
    getPoint(d.angle, (d.score / 100) * maxRadius)
  );
  const pathD =
    dataPoints
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
      .join(" ") + " Z";

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${size} ${size}`}
      className="w-full max-w-[360px] mx-auto"
    >
      {/* Grid levels */}
      {levels.map((level) => {
        const points = domains
          .map((d) => getPoint(d.angle, maxRadius * level))
          .map((p) => `${p.x},${p.y}`)
          .join(" ");
        return (
          <polygon
            key={level}
            points={points}
            fill="none"
            stroke="rgba(45,138,128,0.2)"
            strokeWidth="1"
          />
        );
      })}

      {/* Axis lines */}
      {domains.map((d) => {
        const p = getPoint(d.angle, maxRadius);
        return (
          <line
            key={d.label}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke="rgba(45,138,128,0.12)"
            strokeWidth="1"
          />
        );
      })}

      {/* Data area with glow */}
      <path
        className="radar-data-area"
        d={pathD}
        fill="rgba(45,138,128,0.25)"
        stroke="#2d8a80"
        strokeWidth="2.5"
        filter="url(#glow)"
      />

      {/* Glow filter */}
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle
          key={i}
          className="radar-dot"
          cx={p.x}
          cy={p.y}
          r="6"
          fill="#2d8a80"
          stroke="white"
          strokeWidth="2.5"
        />
      ))}

      {/* Labels */}
      {domains.map((d) => {
        const p = getPoint(d.angle, maxRadius + 30);
        return (
          <text
            key={d.label}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="radar-label fill-white/80 text-[11px] font-semibold"
          >
            {d.label}
          </text>
        );
      })}

      {/* Score labels */}
      {domains.map((d) => {
        const p = getPoint(d.angle, maxRadius + 48);
        return (
          <text
            key={`score-${d.label}`}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="radar-score-label fill-[#3a9e93] text-[13px] font-bold"
          >
            {d.score}
          </text>
        );
      })}
    </svg>
  );
}
