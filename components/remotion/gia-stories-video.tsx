"use client";

import React, { useMemo } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";

// ─── Shared ──────────────────────────────────────
const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

// Seeded random for deterministic particles
function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ─── SVG Components ──────────────────────────────

// Animated SVG constellation / network graph
const ConstellationSVG = ({
  nodeCount,
  color,
  delay,
}: {
  nodeCount: number;
  color: string;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = delay * fps;

  const nodes = useMemo(
    () =>
      Array.from({ length: nodeCount }, (_, i) => ({
        x: seededRandom(i * 3 + 1) * 1080,
        y: seededRandom(i * 3 + 2) * 608,
        r: 2 + seededRandom(i * 3 + 3) * 4,
      })),
    [nodeCount]
  );

  const edges = useMemo(() => {
    const e: { from: number; to: number }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = Math.hypot(
          nodes[i].x - nodes[j].x,
          nodes[i].y - nodes[j].y
        );
        if (dist < 250) e.push({ from: i, to: j });
      }
    }
    return e;
  }, [nodes]);

  const progress = interpolate(frame, [d, d + fps * 2], [0, 1], clamp);
  const globalOpacity = interpolate(frame, [d, d + fps * 0.5], [0, 1], clamp);

  return (
    <svg
      width="1080"
      height="608"
      style={{ position: "absolute", top: 0, left: 0, opacity: globalOpacity * 0.25 }}
    >
      {edges.map((e, i) => {
        const edgeProgress = interpolate(
          progress,
          [i / edges.length, Math.min(1, i / edges.length + 0.3)],
          [0, 1],
          clamp
        );
        return (
          <line
            key={`e-${i}`}
            x1={nodes[e.from].x}
            y1={nodes[e.from].y}
            x2={
              nodes[e.from].x +
              (nodes[e.to].x - nodes[e.from].x) * edgeProgress
            }
            y2={
              nodes[e.from].y +
              (nodes[e.to].y - nodes[e.from].y) * edgeProgress
            }
            stroke={color}
            strokeWidth="0.5"
            opacity={0.4}
          />
        );
      })}
      {nodes.map((n, i) => {
        const nodeOpacity = interpolate(
          progress,
          [i / nodes.length, Math.min(1, i / nodes.length + 0.15)],
          [0, 1],
          clamp
        );
        const pulse = Math.sin((frame + i * 10) / 20) * 0.3 + 1;
        return (
          <circle
            key={`n-${i}`}
            cx={n.x + Math.sin((frame + i * 7) / 30) * 3}
            cy={n.y + Math.cos((frame + i * 11) / 25) * 3}
            r={n.r * pulse * nodeOpacity}
            fill={color}
            opacity={nodeOpacity * 0.6}
          />
        );
      })}
    </svg>
  );
};

// Animated SVG circular progress / orbit
const OrbitRingSVG = ({
  cx,
  cy,
  r,
  color,
  delay,
  strokeWidth = 1.5,
  dashed = false,
}: {
  cx: number;
  cy: number;
  r: number;
  color: string;
  delay: number;
  strokeWidth?: number;
  dashed?: boolean;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = delay * fps;
  const circumference = 2 * Math.PI * r;
  const drawProgress = interpolate(frame, [d, d + fps * 1.5], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.quad),
  });
  const opacity = interpolate(frame, [d, d + fps * 0.3], [0, 0.35], clamp);
  const rotation = interpolate(frame, [0, 300], [0, 120]);

  return (
    <svg
      width={r * 2 + 20}
      height={r * 2 + 20}
      style={{
        position: "absolute",
        left: cx - r - 10,
        top: cy - r - 10,
        opacity,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center",
      }}
    >
      <circle
        cx={r + 10}
        cy={r + 10}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={
          dashed
            ? `${circumference * 0.05} ${circumference * 0.05}`
            : `${circumference}`
        }
        strokeDashoffset={circumference * (1 - drawProgress)}
        strokeLinecap="round"
      />
      {/* Orbiting dot */}
      <circle
        cx={r + 10 + r * Math.cos(drawProgress * Math.PI * 2)}
        cy={r + 10 + r * Math.sin(drawProgress * Math.PI * 2)}
        r={3}
        fill={color}
        opacity={drawProgress > 0.05 ? 0.8 : 0}
      />
    </svg>
  );
};

// Hexagon grid SVG
const HexGridSVG = ({
  x,
  y,
  cols,
  rows,
  size,
  color,
  delay,
}: {
  x: number;
  y: number;
  cols: number;
  rows: number;
  size: number;
  color: string;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hexPath = (cx: number, cy: number, s: number) => {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      return `${cx + s * Math.cos(a)},${cy + s * Math.sin(a)}`;
    });
    return `M${pts.join("L")}Z`;
  };

  return (
    <svg
      width={cols * size * 2 + size}
      height={rows * size * 2}
      style={{ position: "absolute", left: x, top: y, opacity: 0.12 }}
    >
      {Array.from({ length: cols * rows }).map((_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const hx = col * size * 1.75 + (row % 2 === 1 ? size * 0.875 : 0);
        const hy = row * size * 1.5;
        const d = (delay + (col + row) * 0.06) * fps;
        const opacity = interpolate(frame, [d, d + fps * 0.4], [0, 1], clamp);
        return (
          <path
            key={i}
            d={hexPath(hx + size, hy + size, size * 0.9)}
            fill="none"
            stroke={color}
            strokeWidth="0.8"
            opacity={opacity}
          />
        );
      })}
    </svg>
  );
};

// Animated wave SVG
const WaveSVG = ({
  y,
  color,
  amplitude,
  frequency,
  speed,
  opacity: baseOpacity,
}: {
  y: number;
  color: string;
  amplitude: number;
  frequency: number;
  speed: number;
  opacity: number;
}) => {
  const frame = useCurrentFrame();
  const points: string[] = [];
  for (let x = 0; x <= 1080; x += 4) {
    const py =
      y +
      Math.sin((x / 1080) * Math.PI * frequency + frame * speed) * amplitude;
    points.push(`${x},${py}`);
  }
  return (
    <svg
      width="1080"
      height="608"
      style={{ position: "absolute", top: 0, left: 0 }}
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity={baseOpacity}
      />
    </svg>
  );
};

// Particle system using SVG
const ParticleFieldSVG = ({
  count,
  color,
  delay,
  speed = 1,
}: {
  count: number;
  color: string;
  delay: number;
  speed?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = delay * fps;
  const globalOpacity = interpolate(frame, [d, d + fps * 0.5], [0, 1], clamp);

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: seededRandom(i * 2 + 100) * 1080,
        y: seededRandom(i * 2 + 101) * 608,
        size: 1 + seededRandom(i * 2 + 102) * 3,
        vx: (seededRandom(i * 2 + 103) - 0.5) * speed,
        vy: (seededRandom(i * 2 + 104) - 0.5) * speed * 0.5,
        phase: seededRandom(i * 2 + 105) * Math.PI * 2,
      })),
    [count, speed]
  );

  return (
    <svg
      width="1080"
      height="608"
      style={{ position: "absolute", top: 0, left: 0, opacity: globalOpacity }}
    >
      {particles.map((p, i) => {
        const px = (p.x + p.vx * frame + 1080) % 1080;
        const py = (p.y + p.vy * frame + 608) % 608;
        const twinkle =
          Math.sin(frame * 0.1 + p.phase) * 0.3 + 0.5;
        return (
          <circle
            key={i}
            cx={px}
            cy={py}
            r={p.size}
            fill={color}
            opacity={twinkle}
          />
        );
      })}
    </svg>
  );
};

// ─── 3D Components ───────────────────────────────

// Spinning wireframe icosahedron
const FloatingIcosahedron = ({
  position,
  scale,
  color,
}: {
  position: [number, number, number];
  scale: number;
  color: string;
}) => {
  const frame = useCurrentFrame();
  const rotX = frame * 0.015;
  const rotY = frame * 0.02;
  const floatY = Math.sin(frame * 0.04) * 0.15;

  return (
    <mesh
      position={[position[0], position[1] + floatY, position[2]]}
      rotation={[rotX, rotY, 0]}
      scale={scale}
    >
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color={color}
        wireframe
        transparent
        opacity={0.35}
      />
    </mesh>
  );
};

// Gyroscope - 3 intersecting rings
const FloatingGyroscope = ({
  position,
  scale,
  color,
}: {
  position: [number, number, number];
  scale: number;
  color: string;
}) => {
  const frame = useCurrentFrame();
  const floatY = Math.sin(frame * 0.03 + 1) * 0.15;
  const baseRot = frame * 0.01;

  return (
    <group
      position={[position[0], position[1] + floatY, position[2]]}
      scale={scale}
    >
      {/* Ring 1 - horizontal */}
      <mesh rotation={[0, baseRot, 0]}>
        <torusGeometry args={[1, 0.02, 16, 80]} />
        <meshStandardMaterial color={color} transparent opacity={0.35} />
      </mesh>
      {/* Ring 2 - tilted */}
      <mesh rotation={[Math.PI / 3, baseRot * 1.3, 0]}>
        <torusGeometry args={[0.85, 0.02, 16, 80]} />
        <meshStandardMaterial color={color} transparent opacity={0.25} />
      </mesh>
      {/* Ring 3 - tilted other way */}
      <mesh rotation={[-Math.PI / 3, baseRot * 0.7, Math.PI / 4]}>
        <torusGeometry args={[0.7, 0.02, 16, 80]} />
        <meshStandardMaterial color={color} transparent opacity={0.2} />
      </mesh>
      {/* Center sphere */}
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={color} transparent opacity={0.5} emissive={color} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
};

// Octahedron
const FloatingOctahedron = ({
  position,
  scale,
  color,
}: {
  position: [number, number, number];
  scale: number;
  color: string;
}) => {
  const frame = useCurrentFrame();
  const rotX = frame * 0.018;
  const rotY = frame * -0.012;
  const floatY = Math.sin(frame * 0.035 + 2) * 0.12;

  return (
    <mesh
      position={[position[0], position[1] + floatY, position[2]]}
      rotation={[rotX, rotY, 0]}
      scale={scale}
    >
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color={color}
        wireframe
        transparent
        opacity={0.3}
      />
    </mesh>
  );
};

// Ring geometry
const FloatingRing3D = ({
  position,
  scale,
  color,
}: {
  position: [number, number, number];
  scale: number;
  color: string;
}) => {
  const frame = useCurrentFrame();
  const rotX = Math.PI / 3 + Math.sin(frame * 0.02) * 0.3;
  const rotY = frame * 0.015;

  return (
    <mesh
      position={position}
      rotation={[rotX, rotY, 0]}
      scale={scale}
    >
      <torusGeometry args={[1, 0.04, 16, 100]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.4}
      />
    </mesh>
  );
};

// 3D scene with fade-in
const Scene3DBackground = ({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [delay * fps, delay * fps + fps * 0.8],
    [0, 1],
    clamp
  );

  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <ThreeCanvas
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0 }}
        camera={{ position: [0, 0, 6], fov: 50 }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={0.6} color="#ffffff" />
        <pointLight position={[-3, 2, 4]} intensity={0.4} color="#d4a574" />
        <pointLight position={[3, -2, 3]} intensity={0.3} color="#7c3aed" />
        {children}
      </ThreeCanvas>
    </div>
  );
};

// ─── Gradient overlay helper ─────────────────────
const GradientOverlay = ({ colors }: { colors: string }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: colors,
      pointerEvents: "none",
    }}
  />
);

// ─── Scene 1: Title ─────────────────────────────
const SceneTitle = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const logoRotation = interpolate(frame, [0, fps * 0.8], [180, 0], clamp);
  const titleOpacity = interpolate(frame, [0.5 * fps, 1.1 * fps], [0, 1], clamp);
  const titleY = interpolate(frame, [0.5 * fps, 1.1 * fps], [30, 0], clamp);
  const subtitleOpacity = interpolate(frame, [1 * fps, 1.7 * fps], [0, 1], clamp);
  const subtitleY = interpolate(frame, [1 * fps, 1.7 * fps], [15, 0], clamp);

  return (
    <AbsoluteFill>
      <GradientOverlay colors="linear-gradient(135deg, #06060c 0%, #0d0d1f 40%, #0a1628 70%, #06060c 100%)" />

      {/* 3D background */}
      <Scene3DBackground>
        <FloatingIcosahedron position={[-3, 1.5, -2]} scale={0.8} color="#d4a574" />
        <FloatingGyroscope position={[3.5, -1, -3]} scale={0.5} color="#7c3aed" />
        <FloatingOctahedron position={[-2.5, -1.5, -1]} scale={0.5} color="#3b82f6" />
        <FloatingRing3D position={[2.8, 1.8, -2]} scale={0.7} color="#d4a574" />
        <FloatingRing3D position={[-3.5, 0, -1.5]} scale={0.4} color="#3b82f6" />
      </Scene3DBackground>

      {/* SVG overlays */}
      <ConstellationSVG nodeCount={25} color="#d4a574" delay={0.3} />
      <ParticleFieldSVG count={40} color="#ffffff" delay={0} speed={0.3} />

      <WaveSVG y={520} color="#d4a574" amplitude={15} frequency={3} speed={0.05} opacity={0.1} />
      <WaveSVG y={540} color="#7c3aed" amplitude={10} frequency={2.5} speed={0.04} opacity={0.08} />

      <OrbitRingSVG cx={540} cy={270} r={180} color="#d4a574" delay={0.2} dashed />
      <OrbitRingSVG cx={540} cy={270} r={230} color="#7c3aed" delay={0.5} strokeWidth={0.8} />

      <HexGridSVG x={-20} y={-10} cols={6} rows={4} size={28} color="#d4a574" delay={0.8} />
      <HexGridSVG x={720} y={350} cols={5} rows={3} size={24} color="#3b82f6" delay={1} />

      {/* Center content */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div
          style={{
            fontSize: 80,
            transform: `scale(${logoScale}) rotate(${logoRotation}deg)`,
            color: "#d4a574",
            lineHeight: 1,
            textShadow:
              "0 0 80px rgba(212,165,116,0.6), 0 0 160px rgba(212,165,116,0.2)",
          }}
        >
          ✦
        </div>
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            fontSize: 56,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: 8,
            fontFamily: "'Noto Serif JP', serif",
            textShadow: "0 4px 60px rgba(0,0,0,0.7)",
          }}
        >
          GIA Stories
        </div>
        <div
          style={{
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
            fontSize: 18,
            color: "#b0b0c0",
            letterSpacing: 4,
          }}
        >
          信頼でつながる、ストーリーの世界
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene 2: Problem ────────────────────────────
const SceneProblem = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const problems = [
    { icon: "⭐", text: "ランキングに惑わされる", color: "#ef4444" },
    { icon: "👤", text: "誰が書いたかわからない", color: "#f59e0b" },
    { icon: "📢", text: "アルゴリズムで上がる情報", color: "#8b5cf6" },
  ];

  return (
    <AbsoluteFill>
      <GradientOverlay colors="linear-gradient(180deg, #08080f 0%, #12101e 50%, #0a0810 100%)" />

      {/* 3D - chaotic shapes */}
      <Scene3DBackground>
        <FloatingOctahedron position={[-3.5, 2, -3]} scale={0.6} color="#ef4444" />
        <FloatingOctahedron position={[4, -1.5, -2]} scale={0.45} color="#f59e0b" />
        <FloatingIcosahedron position={[3, 2, -4]} scale={0.5} color="#8b5cf6" />
        <FloatingRing3D position={[-2, -1.8, -2]} scale={0.6} color="#ef4444" />
      </Scene3DBackground>

      {/* SVG - static / noise feel */}
      <ParticleFieldSVG count={30} color="#ef4444" delay={0} speed={0.5} />

      {/* Glitch-like horizontal lines */}
      <svg
        width="1080"
        height="608"
        style={{ position: "absolute", top: 0, left: 0, opacity: 0.06 }}
      >
        {Array.from({ length: 20 }).map((_, i) => {
          const yPos = seededRandom(i + 200) * 608;
          const w = 200 + seededRandom(i + 201) * 600;
          const xPos = seededRandom(i + 202) * 400;
          const flicker =
            Math.sin(frame * 0.3 + i * 2) > 0.5 ? 0.15 : 0.03;
          return (
            <rect
              key={i}
              x={xPos}
              y={yPos}
              width={w}
              height={1}
              fill="#ef4444"
              opacity={flicker}
            />
          );
        })}
      </svg>

      <WaveSVG y={580} color="#ef4444" amplitude={8} frequency={6} speed={0.08} opacity={0.08} />

      {/* Content */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          padding: 60,
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: "#ffffff",
            marginBottom: 12,
            opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], clamp),
            fontFamily: "'Noto Serif JP', serif",
            textShadow: "0 2px 30px rgba(0,0,0,0.5)",
          }}
        >
          こんな経験、ありませんか？
        </div>
        {problems.map((p, i) => {
          const delay = 0.5 * fps + i * 0.5 * fps;
          const progress = spring({
            frame: Math.max(0, frame - delay),
            fps,
            config: { damping: 15, stiffness: 120 },
          });
          const x = interpolate(progress, [0, 1], [-60, 0]);
          const barW = interpolate(progress, [0, 1], [0, 100]);
          const o = interpolate(progress, [0, 1], [0, 1]);

          return (
            <div
              key={i}
              style={{
                opacity: o,
                transform: `translateX(${x}px)`,
                display: "flex",
                alignItems: "center",
                gap: 16,
                position: "relative",
                padding: "14px 28px",
                borderRadius: 14,
                overflow: "hidden",
                width: 480,
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: `${barW}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${p.color}18, transparent)`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: 3,
                  height: "100%",
                  background: p.color,
                  opacity: 0.7,
                  borderRadius: "3px 0 0 3px",
                }}
              />
              <span style={{ fontSize: 30, zIndex: 1 }}>{p.icon}</span>
              <span
                style={{
                  fontSize: 22,
                  color: "#e5e7eb",
                  zIndex: 1,
                  fontWeight: 500,
                }}
              >
                {p.text}
              </span>
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene 3: Solution ───────────────────────────
const SceneSolution = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 0.6 * fps], [0, 1], clamp);
  const titleScale = spring({ frame, fps, config: { damping: 200 } });
  const descOpacity = interpolate(frame, [1 * fps, 1.7 * fps], [0, 1], clamp);

  return (
    <AbsoluteFill>
      <GradientOverlay colors="linear-gradient(135deg, #060610 0%, #0e1020 50%, #080c18 100%)" />

      {/* 3D - elegant shapes */}
      <Scene3DBackground delay={0.1}>
        <FloatingGyroscope position={[0, 0, -4]} scale={1.2} color="#d4a574" />
        <FloatingRing3D position={[-3, 0, -2]} scale={1} color="#d4a574" />
        <FloatingRing3D position={[3, 0, -2]} scale={0.8} color="#3b82f6" />
        <FloatingIcosahedron position={[0, 2.5, -3]} scale={0.4} color="#ffffff" />
      </Scene3DBackground>

      {/* SVG constellation */}
      <ConstellationSVG nodeCount={18} color="#d4a574" delay={0.2} />
      <ParticleFieldSVG count={25} color="#d4a574" delay={0.1} speed={0.15} />

      {/* Concentric orbits */}
      <OrbitRingSVG cx={540} cy={280} r={100} color="#d4a574" delay={0.1} />
      <OrbitRingSVG cx={540} cy={280} r={150} color="#d4a574" delay={0.3} dashed strokeWidth={0.8} />
      <OrbitRingSVG cx={540} cy={280} r={210} color="#3b82f6" delay={0.5} strokeWidth={0.6} />

      <WaveSVG y={100} color="#d4a574" amplitude={12} frequency={2} speed={0.03} opacity={0.06} />
      <WaveSVG y={500} color="#3b82f6" amplitude={8} frequency={3} speed={0.04} opacity={0.05} />

      {/* Content */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          padding: 60,
        }}
      >
        {/* Quote mark */}
        <div
          style={{
            fontSize: 100,
            color: "rgba(212,165,116,0.12)",
            fontFamily: "Georgia, serif",
            lineHeight: 0.4,
            marginBottom: -8,
            opacity: titleOpacity,
          }}
        >
          &ldquo;
        </div>
        <div
          style={{
            opacity: titleOpacity,
            transform: `scale(${titleScale})`,
            fontSize: 36,
            fontWeight: 700,
            color: "#d4a574",
            fontFamily: "'Noto Serif JP', serif",
            textShadow:
              "0 0 50px rgba(212,165,116,0.35), 0 2px 20px rgba(0,0,0,0.5)",
            textAlign: "center",
          }}
        >
          この人が薦めるなら間違いない
        </div>

        {/* Divider with SVG diamond */}
        <svg width="200" height="20" style={{ opacity: interpolate(frame, [0.5 * fps, 1.2 * fps], [0, 1], clamp) }}>
          <line
            x1="0"
            y1="10"
            x2={interpolate(frame, [0.5 * fps, 1.2 * fps], [100, 80], clamp)}
            y2="10"
            stroke="#d4a574"
            strokeWidth="1"
            opacity="0.5"
          />
          <polygon
            points="100,4 106,10 100,16 94,10"
            fill="#d4a574"
            opacity={interpolate(frame, [0.8 * fps, 1.2 * fps], [0, 0.7], clamp)}
          />
          <line
            x1={interpolate(frame, [0.5 * fps, 1.2 * fps], [100, 120], clamp)}
            y1="10"
            x2="200"
            y2="10"
            stroke="#d4a574"
            strokeWidth="1"
            opacity="0.5"
          />
        </svg>

        <div
          style={{
            opacity: descOpacity,
            fontSize: 20,
            color: "#9ca3af",
            textAlign: "center",
            lineHeight: 1.9,
          }}
        >
          信頼できる人の紹介だけで
          <br />
          本当に良いものに出会える
          <br />
          そんなプラットフォーム
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene 4: How it works ───────────────────────
const SceneHowItWorks = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const steps = [
    { num: "01", title: "招待で参加", desc: "信頼できる仲間からの紹介で", color: "#3b82f6" },
    { num: "02", title: "ストーリーで出会う", desc: "なぜ薦めるのかを共有", color: "#d4a574" },
    { num: "03", title: "あなたも紹介する", desc: "信頼の輪が広がっていく", color: "#10b981" },
  ];

  return (
    <AbsoluteFill>
      <GradientOverlay colors="linear-gradient(180deg, #080c14 0%, #0d1117 50%, #06080e 100%)" />

      {/* 3D */}
      <Scene3DBackground>
        <FloatingRing3D position={[-3.5, 1.5, -3]} scale={0.6} color="#3b82f6" />
        <FloatingRing3D position={[0, 2, -4]} scale={0.8} color="#d4a574" />
        <FloatingRing3D position={[3.5, 1.5, -3]} scale={0.6} color="#10b981" />
        <FloatingOctahedron position={[-2, -2, -2]} scale={0.35} color="#3b82f6" />
        <FloatingOctahedron position={[2, -2, -2]} scale={0.35} color="#10b981" />
      </Scene3DBackground>

      {/* SVG connection network */}
      <ConstellationSVG nodeCount={15} color="#d4a574" delay={0.3} />
      <ParticleFieldSVG count={20} color="#ffffff" delay={0} speed={0.2} />

      <HexGridSVG x={760} y={20} cols={5} rows={3} size={22} color="#10b981" delay={0.5} />

      {/* SVG connection arrows between cards */}
      <svg
        width="1080"
        height="608"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {/* Arrow 1→2 */}
        {(() => {
          const p = interpolate(frame, [1.5 * fps, 2 * fps], [0, 1], clamp);
          const startX = 330;
          const endX = 420;
          const midX = startX + (endX - startX) * p;
          return (
            <g opacity={p * 0.5}>
              <line
                x1={startX}
                y1={340}
                x2={midX}
                y2={340}
                stroke="#d4a574"
                strokeWidth="2"
                strokeDasharray="6,4"
              />
              <polygon
                points={`${midX},335 ${midX + 8},340 ${midX},345`}
                fill="#d4a574"
              />
            </g>
          );
        })()}
        {/* Arrow 2→3 */}
        {(() => {
          const p = interpolate(frame, [2 * fps, 2.5 * fps], [0, 1], clamp);
          const startX = 660;
          const endX = 750;
          const midX = startX + (endX - startX) * p;
          return (
            <g opacity={p * 0.5}>
              <line
                x1={startX}
                y1={340}
                x2={midX}
                y2={340}
                stroke="#d4a574"
                strokeWidth="2"
                strokeDasharray="6,4"
              />
              <polygon
                points={`${midX},335 ${midX + 8},340 ${midX},345`}
                fill="#d4a574"
              />
            </g>
          );
        })()}
      </svg>

      <WaveSVG y={560} color="#3b82f6" amplitude={6} frequency={4} speed={0.03} opacity={0.06} />

      {/* Content */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          padding: "40px 60px",
        }}
      >
        <div
          style={{
            fontSize: 34,
            fontWeight: 700,
            color: "#ffffff",
            marginBottom: 12,
            opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], clamp),
            fontFamily: "'Noto Serif JP', serif",
            textShadow: "0 2px 30px rgba(0,0,0,0.5)",
          }}
        >
          使い方はシンプル
        </div>

        <div style={{ display: "flex", gap: 32, alignItems: "stretch" }}>
          {steps.map((s, i) => {
            const delay = 0.4 * fps + i * 0.5 * fps;
            const progress = spring({
              frame: Math.max(0, frame - delay),
              fps,
              config: { damping: 15, stiffness: 100 },
            });
            const o = interpolate(progress, [0, 1], [0, 1]);
            const y = interpolate(progress, [0, 1], [50, 0]);

            return (
              <div
                key={i}
                style={{
                  opacity: o,
                  transform: `translateY(${y}px)`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                  width: 260,
                  padding: "28px 20px",
                  background: "rgba(255,255,255,0.03)",
                  backdropFilter: "blur(8px)",
                  borderRadius: 18,
                  border: `1px solid ${s.color}25`,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Top accent line */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "15%",
                    width: "70%",
                    height: 2,
                    background: `linear-gradient(90deg, transparent, ${s.color}, transparent)`,
                    opacity: 0.5,
                  }}
                />
                {/* SVG number circle with ring */}
                <svg width="64" height="64">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill={`${s.color}12`}
                    stroke={s.color}
                    strokeWidth="2"
                    strokeDasharray={`${2 * Math.PI * 28 * o} ${2 * Math.PI * 28}`}
                    opacity={0.5}
                    transform="rotate(-90 32 32)"
                  />
                  <text
                    x="32"
                    y="36"
                    textAnchor="middle"
                    fill={s.color}
                    fontSize="20"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {s.num}
                  </text>
                </svg>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: "#fff",
                    textAlign: "center",
                  }}
                >
                  {s.title}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "#9ca3af",
                    textAlign: "center",
                  }}
                >
                  {s.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene 5: CTA ────────────────────────────────
const SceneCta = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 0.5 * fps], [0, 1], clamp);
  const buttonProgress = spring({
    frame: Math.max(0, frame - 0.8 * fps),
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const buttonScale = interpolate(buttonProgress, [0, 1], [0.5, 1]);
  const pulse = Math.sin(frame / 10) * 0.02 + 1;

  // Starburst particles
  const burstCount = 16;
  const burstDelay = 0.9 * fps;

  return (
    <AbsoluteFill>
      <GradientOverlay colors="linear-gradient(135deg, #060610 0%, #0e1020 40%, #080c18 70%, #060610 100%)" />

      {/* 3D */}
      <Scene3DBackground>
        <FloatingGyroscope position={[0, 0, -5]} scale={1.5} color="#d4a574" />
        <FloatingIcosahedron position={[-3, 2, -3]} scale={0.6} color="#7c3aed" />
        <FloatingIcosahedron position={[3, -2, -3]} scale={0.5} color="#3b82f6" />
        <FloatingRing3D position={[-2, -1, -2]} scale={0.5} color="#d4a574" />
        <FloatingRing3D position={[2.5, 1.5, -2.5]} scale={0.6} color="#7c3aed" />
      </Scene3DBackground>

      {/* SVG layers */}
      <ConstellationSVG nodeCount={20} color="#d4a574" delay={0.1} />
      <ParticleFieldSVG count={35} color="#ffffff" delay={0} speed={0.25} />

      <OrbitRingSVG cx={540} cy={300} r={120} color="#d4a574" delay={0.1} />
      <OrbitRingSVG cx={540} cy={300} r={180} color="#7c3aed" delay={0.3} dashed />
      <OrbitRingSVG cx={540} cy={300} r={250} color="#3b82f6" delay={0.5} strokeWidth={0.6} />

      <WaveSVG y={80} color="#d4a574" amplitude={10} frequency={2.5} speed={0.03} opacity={0.06} />
      <WaveSVG y={530} color="#7c3aed" amplitude={8} frequency={3} speed={0.04} opacity={0.05} />

      <HexGridSVG x={-10} y={400} cols={5} rows={3} size={22} color="#d4a574" delay={0.6} />
      <HexGridSVG x={830} y={40} cols={4} rows={3} size={20} color="#7c3aed" delay={0.8} />

      {/* SVG starburst on button */}
      <svg
        width="1080"
        height="608"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {Array.from({ length: burstCount }).map((_, i) => {
          const angle = (i / burstCount) * Math.PI * 2;
          const dist = interpolate(
            frame,
            [burstDelay, burstDelay + fps * 1.2],
            [0, 100 + (i % 3) * 30],
            clamp
          );
          const o = interpolate(
            frame,
            [burstDelay, burstDelay + fps * 0.3, burstDelay + fps * 1.2],
            [0, 0.6, 0],
            clamp
          );
          const px = 540 + Math.cos(angle) * dist;
          const py = 370 + Math.sin(angle) * dist;
          const size = 2 + (i % 3) * 1.5;
          return (
            <React.Fragment key={i}>
              <circle cx={px} cy={py} r={size} fill={i % 2 === 0 ? "#d4a574" : "#fff"} opacity={o} />
              {/* Trail line */}
              <line
                x1={540 + Math.cos(angle) * dist * 0.3}
                y1={370 + Math.sin(angle) * dist * 0.3}
                x2={px}
                y2={py}
                stroke={i % 2 === 0 ? "#d4a574" : "#7c3aed"}
                strokeWidth="0.5"
                opacity={o * 0.5}
              />
            </React.Fragment>
          );
        })}
      </svg>

      {/* Content */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        <div
          style={{
            opacity,
            fontSize: 40,
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.6,
            fontFamily: "'Noto Serif JP', serif",
            textShadow: "0 4px 60px rgba(0,0,0,0.7)",
          }}
        >
          信頼のストーリー体験を、
          <br />
          始めませんか
        </div>
        <div
          style={{
            opacity: interpolate(buttonProgress, [0, 1], [0, 1]),
            transform: `scale(${buttonScale * pulse})`,
            background: "linear-gradient(135deg, #d4a574 0%, #c4956a 100%)",
            color: "#0f0f0f",
            fontSize: 18,
            fontWeight: 700,
            padding: "16px 52px",
            borderRadius: 999,
            letterSpacing: 1,
            boxShadow:
              "0 0 60px rgba(212,165,116,0.35), 0 0 120px rgba(212,165,116,0.15), 0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          コミュニティに参加する
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Main Composition ────────────────────────────
const SCENE_DURATION = 90;
const TRANSITION_DURATION = 15;

export const GiaStoriesIntro = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={SCENE_DURATION}>
        <SceneTitle />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
      />
      <TransitionSeries.Sequence durationInFrames={SCENE_DURATION}>
        <SceneProblem />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
      />
      <TransitionSeries.Sequence durationInFrames={SCENE_DURATION}>
        <SceneSolution />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
      />
      <TransitionSeries.Sequence durationInFrames={SCENE_DURATION}>
        <SceneHowItWorks />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
      />
      <TransitionSeries.Sequence durationInFrames={SCENE_DURATION}>
        <SceneCta />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};

export const GIA_STORIES_VIDEO_CONFIG = {
  id: "GiaStoriesIntro",
  fps: 30,
  durationInFrames: SCENE_DURATION * 5 - TRANSITION_DURATION * 4,
  width: 1080,
  height: 608,
};
