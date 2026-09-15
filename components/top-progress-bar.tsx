"use client";

// 全ページ共通のトップローディングバー。
// App Router は標準だと画面遷移時のローディング表示が無く、特にスマホで
// 「タップが効いたのか分からない」状態になる。これを解消するために、
//   - 内部リンクのクリックを捕捉して遷移開始 → 上部の細いバーを進める
//   - pathname / searchParams の変化で遷移完了 → バーを満タンにして消す
// 依存ライブラリなしで実装。

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function TopProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  const start = () => {
    clearTimers();
    setVisible(true);
    setWidth(8);
    // じわじわ進める（完了は遷移先 render 時の finish で）
    timers.current.push(window.setTimeout(() => setWidth(40), 120));
    timers.current.push(window.setTimeout(() => setWidth(70), 380));
    timers.current.push(window.setTimeout(() => setWidth(88), 900));
    // 取りこぼし保険：一定時間で強制完了（遷移検知漏れでバーが残らないように）
    timers.current.push(window.setTimeout(() => finish(), 10000));
  };

  const finish = () => {
    clearTimers();
    setWidth(100);
    timers.current.push(
      window.setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 260),
    );
  };

  // 遷移START：内部リンクのクリックを捕捉（capture で先回り）
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const target = e.target as HTMLElement | null;
      const a = target?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      const tgt = a.getAttribute("target");
      if (!href || href.startsWith("#") || (tgt && tgt !== "_self")) return;
      if (a.hasAttribute("download")) return;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return; // 外部リンク除外
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        )
          return; // 同一URL
      } catch {
        return;
      }
      start();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 遷移END：URL（pathname / 検索クエリ）が変わったら完了
  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  useEffect(() => () => clearTimers(), []);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2.5,
        zIndex: 9999,
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.2s ease",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${width}%`,
          background: "var(--edl-gold, #c9a24b)",
          transition: "width 0.3s ease",
          boxShadow: "0 0 8px rgba(201,162,75,0.7)",
        }}
      />
    </div>
  );
}

export function TopProgressBar() {
  // useSearchParams は Suspense 境界が必要（App Router の制約）
  return (
    <Suspense fallback={null}>
      <TopProgressBarInner />
    </Suspense>
  );
}
