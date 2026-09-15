"use client";

// 見比べ用の「紹介を依頼する」。見た目を比べるための画面なので、押したら本物の見本の場所を案内する。
// A は自前の金ボタン（className で渡す）、B は 8bitcn のボタンで描く。

import { Button as BitButton } from "@/components/ui/8bit/button";
import { uiToast } from "@/lib/ui-dialog";
import { cn } from "@/lib/utils";

export function LookIntroButton({
  name,
  look,
  className,
}: {
  name: string;
  look: "a" | "b";
  className?: string;
}) {
  const onClick = () => uiToast(`見た目の見本です。${name}さんへの依頼の流れは /guild の見本で試せます`, "info");

  if (look === "b") {
    return (
      <BitButton type="button" onClick={onClick} className={cn("h-11 text-xs", className)}>
        ▶ 紹介を依頼する
      </BitButton>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      ▶ 紹介を依頼する
    </button>
  );
}
