"use client";

// 夜の酒場の一枚絵（見た目だけ）。外枠（guild-shell）とログインまわりの画面で使う。
// 置き方と暗さは guild-theme.css の .guild-scene-art / .guild-scene-art-dim。
// 絵は public/images/sakaba/<art>_night.png / _day.png。日本時間の 6〜18時は開店前（_day）、それ以外は夜。

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

function sceneOfClock(): "night" | "day" {
  const hour = Number(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo", hour: "numeric", hour12: false }));
  return hour >= 6 && hour < 18 ? "day" : "night";
}
const noSubscribe = () => () => {};

export function GuildSceneArt({ art, dim = false }: { art: string; dim?: boolean }) {
  // サーバーでは夜で描き、ブラウザで時刻に合わせる
  const clock = useSyncExternalStore(noSubscribe, sceneOfClock, () => "night" as const);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- ドット絵は拡大時にぼかさないため img をそのまま使う
    <img
      src={`/images/sakaba/${art}_${clock}.png`}
      alt=""
      aria-hidden
      width={256}
      height={192}
      className={cn("guild-scene-art", dim && "guild-scene-art-dim")}
    />
  );
}
