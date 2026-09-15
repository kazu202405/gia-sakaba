"use client";

/**
 * 株スクール「会社を見る目」セミナーデッキ → 動画
 *
 * 既存の自作HTMLデッキ(1280x720 / 35枚 / .fragment 段階表示つき)を
 * 画像化せず iframe のまま読み込み、フレーム単位でスライドと fragment を
 * 決定的に進めることで動画にする。
 *   → HTMLを直せば動画も直る。作り直しが発生しない。
 *
 * 正本: decks/stock-seminar/stock_seminar_full_visual.html （public/ の外・下の DECK_SRC を参照）
 *   （Desktop/system/codex/outputs/stock-seminar/ は旧コピー。以後編集しないこと）
 * 台本の正本: company/contexts/projects/gia/stock_school.md
 */

import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  delayRender,
  continueRender,
  staticFile,
} from "remotion";

/**
 * デッキHTMLの場所。2026-07-29 に `public/` の外（リポジトリ直下の `decks/`）へ移した。
 * public/ に置くと gia2018.com/decks/… で誰でも中身を読めてしまい、
 * 無料セミナーに来る理由が薄くなるため。
 *
 * Remotion の staticFile() は public/ しか見ない。**このコンポジションをレンダーするときだけ**
 * 一時的にコピーしてから実行し、終わったら消すこと：
 *   cp -r decks/stock-seminar public/decks/stock-seminar
 *   npx remotion render remotion/index.ts StockSeminarDeck out/deck.mp4
 *   rm -rf public/decks
 *
 * ※ 本番セミナーは画面録画で作る方針（stock_school.md §10.5）なので、
 *   この動画化は当面使わない見込み。使うときだけ上の手順を踏む。
 */
const DECK_SRC = "decks/stock-seminar/stock_seminar_full_visual.html";

const DECK_W = 1280;
const DECK_H = 720;
const FPS = 30;

// ─── タイミング設計（フレーム）──────────────────
const HOLD_BASE = 4 * FPS; // スライド1枚の基本尺 4秒
const HOLD_PER_FRAGMENT = 1.4 * FPS; // fragment 1つあたり +1.4秒
const CUT_FADE = 0.35 * FPS; // 切り替えの黒フェード

/**
 * 各スライドの .fragment 数（HTMLから機械抽出した実測値）。
 * durationInFrames を静的に決めるためソースに持たせている。
 * HTML側で段階表示を増減したら、この配列も取り直すこと：
 *   node -e "...(README相当のコマンドは stock_school.md 参照)"
 */
// 段階表示のあるスライド（HTMLと一致必須）：
// 3:3 5:8 7:2 9:13 10:3 11:3 12:2 13:2 14:4 15:3 16:2 17:2 18:3 19:9 20:7
// 23:4 25:4 26:8 28:3 29:6 30:1 31:4 ＝ 計96段階（全32枚）
export const FRAGMENT_COUNTS = [
  0, 0, 3, 0, 8, 0, 2, 0, 13, 3, 3, 2, 2, 4, 3, 2, 2, 3, 9, 7, 0, 0, 4, 0, 4, 8,
  0, 3, 6, 1, 4, 0,
];
export const SLIDE_COUNT = FRAGMENT_COUNTS.length;

/** 何枚目から何枚ぶんを動画にするか */
export type DeckRange = { from: number; count: number };

// ─── 1スライドあたりの尺を求める ────────────────
const slideDuration = (fragmentCount: number) =>
  HOLD_BASE + fragmentCount * HOLD_PER_FRAGMENT;

/**
 * フレーム → { スライド番号, 表示済みfragment数, 不透明度 }
 * fragmentCounts が判るまでは全スライド fragment 0 として概算する。
 */
const resolveTimeline = (
  frame: number,
  fragmentCounts: number[],
  range: DeckRange
) => {
  let cursor = 0;
  for (let i = 0; i < range.count; i++) {
    const slideIndex = range.from + i;
    const frags = fragmentCounts[slideIndex] ?? 0;
    const dur = slideDuration(frags);
    if (frame < cursor + dur) {
      const local = frame - cursor;
      // fragment は基本尺の途中から順に出す
      const shown = Math.min(
        frags,
        Math.max(0, Math.floor((local - HOLD_BASE * 0.5) / HOLD_PER_FRAGMENT) + 1)
      );
      // 頭とお尻を黒でつなぐ
      const fadeIn = interpolate(local, [0, CUT_FADE], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      const fadeOut = interpolate(local, [dur - CUT_FADE, dur], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      return { slideIndex, shown, opacity: Math.min(fadeIn, fadeOut), local, dur };
    }
    cursor += dur;
  }
  const last = range.from + range.count - 1;
  return {
    slideIndex: last,
    shown: fragmentCounts[last] ?? 0,
    opacity: 0,
    local: 0,
    dur: 0,
  };
};

/** 全体の尺（fragment数が判る前は概算） */
export const totalDuration = (fragmentCounts: number[], range: DeckRange) => {
  let sum = 0;
  for (let i = 0; i < range.count; i++) {
    sum += slideDuration(fragmentCounts[range.from + i] ?? 0);
  }
  return sum;
};

export const StockSeminarDeck: React.FC<{ range?: DeckRange }> = ({
  range = { from: 0, count: SLIDE_COUNT },
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fragmentCounts = FRAGMENT_COUNTS;
  const [handle] = useState(() => delayRender("デッキHTMLの読み込み"));
  // iframe読み込み完了を state に持つ。これが無いと単一フレーム描画(remotion still)のとき
  // 反映用の useLayoutEffect が読み込み前に1回走って終わり、1枚目のまま固まる
  const [loaded, setLoaded] = useState(false);

  // ─── 読み込み完了時：デッキのUIを消し、fragment数を数える ───
  const onLoad = useCallback(async () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    // 操作UI・進捗バー・講師ノートは動画には不要
    const style = doc.createElement("style");
    style.textContent = `
      #controls, #help, #progress, #notes-panel, .slide-no { display:none !important; }
      html, body { background:#071522 !important; }
      /* 段階表示は既定で隠し、Remotion側から .visible を付けて出す */
      .fragment { opacity:0; }
      .fragment.visible { opacity:1; }
      /* CSSトランジションはフレームレンダーと相性が悪いので無効化 */
      * { transition:none !important; animation:none !important; }
    `;
    doc.head.appendChild(style);

    // 尺は FRAGMENT_COUNTS（静的）で決めている。HTML側とズレたら気付けるようにする
    const slides = [...doc.querySelectorAll<HTMLElement>(".slide")];
    const live = slides.map((s) => s.querySelectorAll(".fragment").length);
    if (live.join() !== FRAGMENT_COUNTS.join()) {
      console.warn(
        "[deck] fragment数がソースの FRAGMENT_COUNTS と一致しません。尺がズレます:",
        live
      );
    }

    // 画像の読み込みを待ってからレンダー再開
    const imgs = [...doc.querySelectorAll("img")];
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((res) => {
              img.onload = res;
              img.onerror = res;
            })
      )
    );
    if (doc.fonts) await doc.fonts.ready;
    setLoaded(true);
    continueRender(handle);
  }, [handle]);

  const { slideIndex, shown, opacity } = resolveTimeline(
    frame,
    fragmentCounts,
    range
  );

  // ─── 毎フレーム：表示スライドと fragment を反映（描画前に同期実行）───
  useLayoutEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const slides = [...doc.querySelectorAll<HTMLElement>(".slide")];
    if (!slides.length) return;

    slides.forEach((s, i) => s.classList.toggle("active", i === slideIndex));

    const frags = [
      ...slides[slideIndex].querySelectorAll<HTMLElement>(".fragment"),
    ];
    frags.forEach((f, i) => f.classList.toggle("visible", i < shown));
  }, [slideIndex, shown, loaded]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#071522" }}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            width: DECK_W,
            height: DECK_H,
            opacity,
            // 1280x720 のデッキを出力解像度いっぱいまで拡大
            transform: `scale(${Math.min(width / DECK_W, height / DECK_H)})`,
            transformOrigin: "center center",
          }}
        >
          <iframe
            ref={iframeRef}
            onLoad={onLoad}
            src={staticFile(DECK_SRC)}
            width={DECK_W}
            height={DECK_H}
            style={{ border: "none", display: "block" }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 全32枚の通し版（無音）。32×4秒 + fragment96個×1.4秒 ＝ 約4分15秒
export const STOCK_SEMINAR_DECK_CONFIG = {
  id: "StockSeminarDeck",
  fps: FPS,
  durationInFrames: totalDuration(FRAGMENT_COUNTS, {
    from: 0,
    count: SLIDE_COUNT,
  }),
  width: 1920,
  height: 1080,
};
