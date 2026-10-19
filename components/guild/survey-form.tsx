"use client";

// 酒場の事前アンケート。ログインなしで開く（app/guild/survey/page.tsx）。
// 流れ：入力 → 同じ窓の中で内容を見直し → 送る → お礼。「もどって なおす」で入力は消えない。
// 文言と値段の札は lib/guild/survey.ts の定数から読む（ここには書かない）。

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  SURVEY_COPY,
  SURVEY_KEY,
  SURVEY_NAME_MAX,
  SURVEY_NOT_JOINING,
  SURVEY_PRICE_CHIPS,
  SURVEY_WISH_MAX,
  checkSurveyInput,
  priceLabel,
  readStoredResponseToken,
  storeResponseToken,
} from "@/lib/guild/survey";
import { cn } from "@/lib/utils";
import { Window } from "./cards";
import { Field, TextArea, TextInput, scrollToFirstError } from "./form-parts";

type Phase = "edit" | "review" | "done";
type FieldErrors = { name?: string; price?: string; wish?: string };

export function SurveyForm({ inviteUrl }: { inviteUrl: string | null }) {
  const [phase, setPhase] = useState<Phase>("edit");
  const [name, setName] = useState("");
  const [chip, setChip] = useState<number | null>(null);
  const [customPrice, setCustomPrice] = useState("");
  const [wish, setWish] = useState("");
  // 見えない入力欄。人は触らない。何か入っていたら RPC 側が保存しない（機械による送信よけ）
  const [trap, setTrap] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sendError, setSendError] = useState("");
  const [busy, setBusy] = useState(false);
  // 2度押しの錠。state は反映が遅れるので、押した瞬間に ref でかける。成功したら外さない
  const sendLock = useRef(false);

  const checked = checkSurveyInput({ name, chip, customPrice, wish });

  function chooseChip(yen: number) {
    setChip(yen);
    setCustomPrice("");
    setErrors((e) => ({ ...e, price: undefined }));
  }

  function typeCustomPrice(value: string) {
    setCustomPrice(value);
    if (value.trim() !== "") setChip(null);
    setErrors((e) => ({ ...e, price: undefined }));
  }

  function goReview() {
    const result = checkSurveyInput({ name, chip, customPrice, wish });
    if (!result.ok) {
      setErrors(result.errors);
      scrollToFirstError();
      return;
    }
    setErrors({});
    setSendError("");
    setPhase("review");
  }

  async function send() {
    if (sendLock.current) return;
    sendLock.current = true;
    setBusy(true);
    setSendError("");
    const result = checkSurveyInput({ name, chip, customPrice, wish });
    if (!result.ok) {
      sendLock.current = false;
      setBusy(false);
      setErrors(result.errors);
      setPhase("edit");
      return;
    }
    const { data, error } = await createClient().rpc("sakaba_submit_survey", {
      p_survey_key: SURVEY_KEY,
      p_display_name: result.answer.displayName,
      p_max_monthly_price_yen: result.answer.priceYen,
      p_wish_text: result.answer.wishText,
      p_trap: trap,
      p_response_token: readStoredResponseToken(),
    });
    if (error) {
      // 失敗：錠を外し、入力は残して理由を出す
      sendLock.current = false;
      setBusy(false);
      setSendError(error.message.includes("survey_rate_limited") ? SURVEY_COPY.errors.rateLimited : SURVEY_COPY.errors.failed);
      return;
    }
    // 成功：錠は外さない（同じ内容をもう一度送れないように）。回答IDは端末に残し、送り直しはその行を更新する
    storeResponseToken((data as { response_token?: unknown } | null)?.response_token);
    setBusy(false);
    setPhase("done");
  }

  if (phase === "done") {
    return (
      <Window title={SURVEY_COPY.doneTitle}>
        <p role="status" className="text-sm leading-relaxed">{SURVEY_COPY.doneMessage}</p>
        {inviteUrl && (
          <div className="mt-6 space-y-3">
            <p className="c-muted text-sm leading-relaxed">{SURVEY_COPY.inviteLead}</p>
            <Link href={inviteUrl} className="rpg-button min-h-12 px-5">{SURVEY_COPY.inviteButton}</Link>
          </div>
        )}
      </Window>
    );
  }

  if (phase === "review" && checked.ok) {
    const { displayName, priceYen, wishText } = checked.answer;
    return (
      <Window title={SURVEY_COPY.reviewTitle}>
        <p className="c-muted text-sm">{SURVEY_COPY.reviewLead}</p>
        <dl className="mt-5 space-y-4 text-sm">
          <ReviewRow label={SURVEY_COPY.nameLabel} value={displayName} />
          <ReviewRow label={SURVEY_COPY.priceLabel} value={priceLabel(priceYen)} note={priceYen === SURVEY_NOT_JOINING ? undefined : SURVEY_COPY.priceNote} />
          <ReviewRow label={SURVEY_COPY.wishLabel} value={wishText || "（書いていません）"} />
        </dl>
        {sendError && <p role="alert" className="mt-4 text-sm text-[#c62828]">{sendError}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => void send()} disabled={busy} className="rpg-button min-h-12 px-5">
            {busy ? SURVEY_COPY.sending : SURVEY_COPY.sendButton}
          </button>
          <button type="button" onClick={() => setPhase("edit")} disabled={busy} className="c-muted min-h-11 text-sm underline disabled:opacity-50">
            {SURVEY_COPY.backButton}
          </button>
        </div>
      </Window>
    );
  }

  return (
    <Window title={SURVEY_COPY.formTitle}>
      <form onSubmit={(e) => { e.preventDefault(); goReview(); }} className="space-y-7" noValidate>
        <Field label={SURVEY_COPY.nameLabel} hint={SURVEY_COPY.nameHint} required error={errors.name}>
          <TextInput value={name} onChange={setName} max={SURVEY_NAME_MAX} label={SURVEY_COPY.nameLabel} />
        </Field>

        <Field label={SURVEY_COPY.priceLabel} hint={SURVEY_COPY.priceHint} required error={errors.price}>
          <div role="group" aria-label={SURVEY_COPY.priceLabel} className="flex flex-wrap gap-2">
            {SURVEY_PRICE_CHIPS.map((yen) => (
              <PriceChip key={yen} selected={chip === yen} onClick={() => chooseChip(yen)}>{priceLabel(yen)}</PriceChip>
            ))}
            <PriceChip selected={chip === SURVEY_NOT_JOINING} onClick={() => chooseChip(SURVEY_NOT_JOINING)}>
              {SURVEY_COPY.notJoiningLabel}
            </PriceChip>
          </div>
          <label className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="c-muted">{SURVEY_COPY.customPriceLabel}</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={9}
              value={customPrice}
              onChange={(e) => typeCustomPrice(e.target.value)}
              aria-label={SURVEY_COPY.customPriceLabel}
              className="c-input h-11 w-36"
            />
            <span>{SURVEY_COPY.customPriceUnit}</span>
          </label>
          <p className="c-muted mt-2 text-xs">{SURVEY_COPY.priceNote}</p>
        </Field>

        <Field label={SURVEY_COPY.wishLabel} hint={SURVEY_COPY.wishHint} optional error={errors.wish}>
          <TextArea value={wish} onChange={setWish} rows={5} max={SURVEY_WISH_MAX} label={SURVEY_COPY.wishLabel} />
        </Field>

        {/* 見えない入力欄（機械よけ）。画面の外に置き、読み上げ・キー操作の対象にもしない */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
          </label>
        </div>

        <button type="submit" className="rpg-button min-h-12 px-5">{SURVEY_COPY.confirmButton}</button>
      </form>
    </Window>
  );
}

function PriceChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(selected ? "c-chip-strong" : "c-chip", "min-h-11 cursor-pointer px-4 text-sm")}
    >
      {children}
    </button>
  );
}

function ReviewRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="guild-px text-[15px] tracking-wider">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words">{value}</dd>
      {note && <dd className="c-muted mt-0.5 text-xs">{note}</dd>}
    </div>
  );
}
