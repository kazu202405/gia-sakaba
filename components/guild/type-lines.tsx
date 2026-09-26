"use client";

// 文を1文字ずつ出す（見た目の演出だけ）。行は上から順に出て、出しきったら ▼ が点滅する。
// 押すと残りを全部出す。動きを減らす設定の人には最初から全部出す。読み上げには最初から全文を渡す。

import { useEffect, useState } from "react";

/** 1行＝いくつかの切れ端。数字だけ大きくする、などのために切れ端ごとに class を付けられる */
export type TypeSegment = { text: string; className?: string };
export type TypeLine = { segments: TypeSegment[]; className?: string };

const STEP_MS = 40;

export function TypeLines({ lines, className }: { lines: TypeLine[]; className?: string }) {
  const total = lines.reduce((sum, line) => sum + line.segments.reduce((s, seg) => s + seg.text.length, 0), 0);
  const [shown, setShown] = useState(0);
  const done = shown >= total;

  useEffect(() => {
    if (done) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setShown((n) => (reduce ? total : n + 1)), reduce ? 0 : STEP_MS);
    return () => window.clearTimeout(timer);
  }, [shown, done, total]);

  // 各切れ端が全体の何文字目から始まるか
  const starts = lines.map((line, i) => {
    const before = lines.slice(0, i).reduce((sum, l) => sum + l.segments.reduce((s, seg) => s + seg.text.length, 0), 0);
    return line.segments.map((_, j) => before + line.segments.slice(0, j).reduce((s, seg) => s + seg.text.length, 0));
  });

  return (
    <div className={className} onClick={() => setShown(total)}>
      <div aria-hidden>
        {lines.map((line, i) => (
          <p key={i} className={line.className}>
            {line.segments.map((seg, j) => {
              const visible = seg.text.slice(0, Math.max(0, shown - starts[i][j]));
              return (
                <span key={j} className={seg.className}>
                  {visible}
                </span>
              );
            })}
            {/* まだ出ていない行も高さを取っておき、文が出るたびに下が動かないようにする */}
            {"\u200b"}
          </p>
        ))}
      </div>
      <div className="sr-only">
        {lines.map((line, i) => (
          <p key={i}>{line.segments.map((seg) => seg.text).join("")}</p>
        ))}
      </div>
      {/* ▼は文の下の行の右端に出す（文の横に置くと、行末が1〜2文字だけ折り返されるため） */}
      <p className="flex h-4 justify-end leading-none" aria-hidden>
        {done && <span className="rpg-blink text-[#d9b45a]">▼</span>}
      </p>
    </div>
  );
}
