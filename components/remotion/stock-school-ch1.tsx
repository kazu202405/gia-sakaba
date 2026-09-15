"use client";

/**
 * 株スクール 第1章「株を買うとは何か」— 対比1枚の動画版（テスト）
 * 台本の正本: company/contexts/projects/gia/stock_school.md 第1章
 * 目的: セミナー代替動画の作り方検証。文言は台本からそのまま引いている。
 */

import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

// ─── ブランド ────────────────────────────────────
const NAVY = "#060610";
const NAVY_2 = "#0e1020";
const GOLD = "#d4a574";
const WHITE = "#ffffff";
const MUTED = "#9ca3af";
const SERIF = "'Noto Serif JP', 'Yu Mincho', '游明朝', serif";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

// ─── 共通: 下からふわっと出す ────────────────────
const Rise: React.FC<{
  delay: number; // フレーム
  children: React.ReactNode;
  distance?: number;
  style?: React.CSSProperties;
}> = ({ delay, children, distance = 28, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, mass: 0.6 },
  });
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${(1 - p) * distance}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// 背景（ネイビーのグラデーション＋うっすらグリッド）
const Backdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(120% 90% at 50% 0%, ${NAVY_2} 0%, ${NAVY} 70%)`,
    }}
  >
    <AbsoluteFill
      style={{
        opacity: 0.16,
        backgroundImage: `linear-gradient(${GOLD}22 1px, transparent 1px), linear-gradient(90deg, ${GOLD}22 1px, transparent 1px)`,
        backgroundSize: "96px 96px",
      }}
    />
  </AbsoluteFill>
);

// ─── シーンA: 問い（5秒）────────────────────────
const SceneQuestion: React.FC = () => {
  const frame = useCurrentFrame();
  const out = interpolate(frame, [120, 150], [1, 0], clamp);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: out,
        fontFamily: SERIF,
        textAlign: "center",
      }}
    >
      <Rise delay={6}>
        <div style={{ color: MUTED, fontSize: 40, letterSpacing: "0.18em" }}>
          知人から、こう言われました。
        </div>
      </Rise>
      <Rise delay={34} style={{ marginTop: 56 }}>
        <div
          style={{
            color: WHITE,
            fontSize: 82,
            fontWeight: 600,
            lineHeight: 1.45,
          }}
        >
          「うちの会社に、
          <br />
          100万円 出資してくれ」
        </div>
      </Rise>
      <Rise delay={76} style={{ marginTop: 64 }}>
        <div style={{ color: GOLD, fontSize: 44, letterSpacing: "0.1em" }}>
          何を聞きますか？
        </div>
      </Rise>
    </AbsoluteFill>
  );
};

// ─── シーンB: 対比1枚（15秒）───────────────────
const LEFT_ITEMS = [
  "何の会社か",
  "売上はいくらか",
  "利益は出ているか",
  "借金はあるか",
  "社長は誰か",
  "どうやって儲けているか",
  "今後 伸びるのか",
];
const RIGHT_ITEMS = ["チャート", "ニュース", "材料", "「上がりそう」"];

const Column: React.FC<{
  title: string;
  items: string[];
  accent: string;
  startAt: number;
  align: "left" | "right";
}> = ({ title, items, accent, startAt, align }) => (
  <div style={{ flex: 1, padding: "0 72px", textAlign: align }}>
    <Rise delay={startAt}>
      <div
        style={{
          color: accent,
          fontSize: 30,
          letterSpacing: "0.16em",
          borderBottom: `1px solid ${accent}55`,
          paddingBottom: 20,
          marginBottom: 44,
          fontFamily: SERIF,
        }}
      >
        {title}
      </div>
    </Rise>
    {items.map((t, i) => (
      <Rise key={t} delay={startAt + 14 + i * 9}>
        <div
          style={{
            color: WHITE,
            fontSize: 46,
            lineHeight: 1.9,
            fontFamily: SERIF,
            opacity: 0.94,
          }}
        >
          {t}
        </div>
      </Rise>
    ))}
  </div>
);

const SceneContrast: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // 中央の金の縦線が伸びる
  const line = spring({
    frame: frame - 96,
    fps,
    config: { damping: 200, mass: 1.2 },
  });
  const out = interpolate(frame, [420, 450], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <AbsoluteFill
        style={{
          flexDirection: "row",
          alignItems: "flex-start", // 左右の見出しを同じ高さで揃える
          padding: "180px 80px 0",
        }}
      >
        <Column
          title="知人の会社に出資するとき、見るもの"
          items={LEFT_ITEMS}
          accent={GOLD}
          startAt={0}
          align="left"
        />
        <div
          style={{
            width: 1,
            height: 720,
            background: GOLD,
            transform: `scaleY(${line})`,
            opacity: 0.7,
          }}
        />
        <Column
          title="上場企業の株を買うとき、見るもの"
          items={RIGHT_ITEMS}
          accent={MUTED}
          startAt={132}
          align="left"
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── シーンC: 断（3秒）─────────────────────────
const SceneVerdict: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rule = spring({
    frame: frame - 20,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const out = interpolate(frame, [70, 90], [1, 0], clamp);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: out,
        fontFamily: SERIF,
      }}
    >
      <Rise delay={0}>
        <div
          style={{
            color: WHITE,
            fontSize: 76,
            fontWeight: 600,
            lineHeight: 1.6,
            textAlign: "center",
          }}
        >
          値段だけを見て、
          <br />
          会社を見ていない。
        </div>
      </Rise>
      <div
        style={{
          marginTop: 48,
          width: 560,
          height: 2,
          background: GOLD,
          transform: `scaleX(${rule})`,
        }}
      />
    </AbsoluteFill>
  );
};

// ─── シーンD: 決め台詞（4秒）────────────────────
const SceneClose: React.FC = () => {
  const frame = useCurrentFrame();
  const glow = interpolate(frame, [0, 40], [0, 1], clamp);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        fontFamily: SERIF,
        textAlign: "center",
      }}
    >
      <Rise delay={4}>
        <div style={{ color: MUTED, fontSize: 42, lineHeight: 1.9 }}>
          皆さんは経営者としては、会社を見られます。
          <br />
          株になると急に、見なくなるだけです。
        </div>
      </Rise>
      <Rise delay={44} style={{ marginTop: 64 }}>
        <div
          style={{
            color: GOLD,
            fontSize: 66,
            fontWeight: 600,
            lineHeight: 1.6,
            textShadow: `0 0 ${glow * 40}px ${GOLD}55`,
          }}
        >
          今日はその目を、
          <br />
          そのまま上場企業に向けます。
        </div>
      </Rise>
    </AbsoluteFill>
  );
};

// ─── 本体 ────────────────────────────────────────
export const StockSchoolCh1: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: NAVY }}>
    <Backdrop />
    <Sequence durationInFrames={150}>
      <SceneQuestion />
    </Sequence>
    <Sequence from={150} durationInFrames={450}>
      <SceneContrast />
    </Sequence>
    <Sequence from={600} durationInFrames={90}>
      <SceneVerdict />
    </Sequence>
    <Sequence from={690} durationInFrames={120}>
      <SceneClose />
    </Sequence>
  </AbsoluteFill>
);

export const STOCK_SCHOOL_CH1_CONFIG = {
  id: "StockSchoolCh1",
  fps: 30,
  durationInFrames: 810, // 27秒
  width: 1920,
  height: 1080,
};
