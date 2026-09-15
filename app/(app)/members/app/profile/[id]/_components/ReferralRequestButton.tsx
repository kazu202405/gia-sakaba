"use client";

// 紹介依頼モーダルを開くトリガーボタン。
// Server Component の profile 詳細ページから「紹介してほしい」CTA として呼ぶ。

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { ReferralRequestModal } from "@/components/profile/ReferralRequestModal";

interface ReferralRequestButtonProps {
  targetName: string;
  targetTitle?: string;
  targetPhotoUrl?: string | null;
  /** 紹介依頼を実際に送れるか（有料会員=true）。false なら押下で /upgrade へ誘導。 */
  canRequest: boolean;
}

export function ReferralRequestButton({
  targetName,
  targetTitle,
  targetPhotoUrl,
  canRequest,
}: ReferralRequestButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // 無料会員は紹介依頼モーダルを開かず、アップグレード導線へ。
  const handleClick = () => {
    if (!canRequest) {
      router.push("/upgrade");
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--gia-navy)] hover:bg-[var(--gia-navy)]/90 text-white text-sm font-semibold tracking-[0.02em] transition-colors"
      >
        <Send className="w-4 h-4" />
        紹介してほしい
      </button>
      {canRequest && (
        <ReferralRequestModal
          open={open}
          onClose={() => setOpen(false)}
          target={{
            name: targetName,
            title: targetTitle,
            photoUrl: targetPhotoUrl ?? null,
          }}
        />
      )}
    </>
  );
}
