"use client";

// 「紹介を依頼する」のボタンとモーダル。
// 相手に直接は届かない。ギルドマスターが見て、相手の承諾を取ってから連絡先が開く。

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { IntroPurpose, Profile } from "@/lib/guild/types";
import { closedStatuses, introStatusLabel, purposeLabel } from "@/lib/guild/labels";
import { ME_ID, introRequests } from "@/lib/guild/mock-data";
import { uiToast } from "@/lib/ui-dialog";

const PURPOSES = Object.keys(purposeLabel) as IntroPurpose[];

export function IntroRequestButton({ target }: { target: Profile }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  if (target.id === ME_ID) return null;

  // 同じ相手への進行中の依頼は1本まで
  const existing = introRequests.find(
    (r) => r.requester_id === ME_ID && r.target_id === target.id && !closedStatuses.includes(r.status),
  );
  if (existing || sent) {
    return (
      <Link href="/guild/requests" className="c-button-sub h-12 w-full sm:w-auto">
        いらい中：{existing ? introStatusLabel[existing.status].requester : "ギルドマスターが確認中"}
      </Link>
    );
  }

  if (!target.accept_intro) {
    return (
      <p className="c-card border-dashed px-4 py-3 text-sm">
        {target.display_name}さんは、いまは しょうかいを受けつけていません。
      </p>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rpg-button h-12 w-full text-base sm:w-auto">
        ▶ 紹介を依頼する
      </button>
      {open && (
        <IntroRequestDialog
          target={target}
          onClose={() => setOpen(false)}
          onSent={() => {
            setOpen(false);
            setSent(true);
            uiToast("紹介を依頼しました（見本のため保存はされません）");
          }}
        />
      )}
    </>
  );
}

function IntroRequestDialog({
  target,
  onClose,
  onSent,
}: {
  target: Profile;
  onClose: () => void;
  onSent: () => void;
}) {
  const [purpose, setPurpose] = useState<IntroPurpose | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const submit = () => {
    // 押したのに何も起きない、を作らない。理由をその場に出す
    if (!purpose) {
      setError("もくてきを選んでください");
      return;
    }
    onSent();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#1b2a41]/50" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-labelledby="intro-dialog-title" className="c-window relative w-full pt-9 sm:max-w-lg">
        <h2 id="intro-dialog-title" className="c-window-title">
          しょうかい いらい
        </h2>
        <button type="button" onClick={onClose} aria-label="閉じる" className="absolute top-1.5 right-2 px-2 text-xl leading-none">
          ×
        </button>

        {/* 名札が切れないよう、スクロールは内側だけにする */}
        <div className="max-h-[80vh] overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">
          <p className="text-base">{target.display_name}さんを しょうかいしてもらう</p>
          <p className="c-muted mt-2 text-[13px] leading-relaxed">
            相手に直接は とどきません。ギルドマスターが確認し、{target.display_name}
            さんが承諾したら、おたがいの れんらく先が見えるようになります。
          </p>

          <fieldset className="mt-5">
            <legend className="text-[15px]">
              もくてき <span className="text-xs text-[#c62828]">必須</span>
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PURPOSES.map((p, i) => (
                <button
                  key={p}
                  ref={i === 0 ? firstRef : undefined}
                  type="button"
                  aria-pressed={purpose === p}
                  onClick={() => {
                    setPurpose(p);
                    setError("");
                  }}
                  className="c-choice px-3 py-2.5 text-sm"
                >
                  {purposeLabel[p]}
                </button>
              ))}
            </div>
            <p className="mt-1.5 min-h-[1rem] text-xs text-[#c62828]">{error}</p>
          </fieldset>

          <label className="mt-2 block">
            <span className="text-[15px]">ギルドマスターへの ひとこと</span>
            <span className="c-muted ml-1 text-xs">任意</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={400}
              placeholder="れい：採用ページの件で、一度お話を伺いたいです"
              className="c-input mt-2"
            />
          </label>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="c-button-sub h-11">
              キャンセル
            </button>
            <button type="button" onClick={submit} className="rpg-button h-11">
              ▶ 依頼を送る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
