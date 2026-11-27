"use client";

import { useRef, useState, useTransition } from "react";
import { DateInput } from "@/components/guild/form-parts";
import { useGuildRouter } from "@/components/guild/use-guild-router";
import { areaText, POST_CATEGORIES, POST_VISIBILITIES } from "@/lib/guild/look/sns-mock";
import { AreaPicker } from "@/components/guild/look/sns/area-picker";
import type { ConstructionResult } from "@/lib/guild/construction-forms";

export function ConstructionForm({ action, children, submit, className, reviewPost = false }: {
  action: (form: FormData) => Promise<ConstructionResult>;
  children: React.ReactNode;
  submit: string;
  className?: string;
  reviewPost?: boolean;
}) {
  const router = useGuildRouter();
  const [result, setResult] = useState<ConstructionResult>();
  const [review, setReview] = useState<FormData | null>(null);
  const [pending, startTransition] = useTransition();
  const lock = useRef(false);

  return (
    <form className={className} onSubmit={(event) => {
      event.preventDefault();
      if (lock.current) return;
      const fields = review ?? new FormData(event.currentTarget);
      if (reviewPost && !review) {
        if (!fields.getAll("area").length) {
          setResult({ error: "探している地域をひとつ以上選んでください。" });
          return;
        }
        setResult(undefined);
        setReview(fields);
        return;
      }
      lock.current = true;
      setResult(undefined);
      startTransition(async () => {
        try {
          const next = await action(fields);
          setResult(next);
          if ("href" in next && next.href) router.push(next.href);
        } catch {
          setResult({ error: "処理の結果を確認できませんでした。ページを開き直して確認してください。" });
        } finally {
          lock.current = false;
        }
      });
    }}>
      <fieldset className="space-y-3" disabled={pending} hidden={Boolean(review)}>
        {children}
        <button type="submit" className="c-button-main px-4 py-2" disabled={pending}>{pending ? "処理中…" : reviewPost ? "内容を確かめる" : submit}</button>
      </fieldset>
      {review && <div className="space-y-3">
        <h2 className="font-bold">この内容で依頼を出しますか？</h2>
        <dl className="space-y-2">
          {[
            ["タイトル", review.get("title")],
            ["カテゴリー", POST_CATEGORIES.find((choice) => choice.key === review.get("category"))?.label],
            ["探している業種", review.get("industry")],
            ["探している地域", areaText(review.getAll("area").map(String))],
            ["内容", review.get("body")],
            ["返事の期限", review.get("deadline") || "未設定"],
            ["問い合わせ先", review.get("contact")],
            ["公開範囲", POST_VISIBILITIES.find((choice) => choice.key === review.get("visibility"))?.label],
          ].map(([label, value]) => <div key={String(label)}><dt className="text-sm font-bold">{String(label)}</dt><dd className="whitespace-pre-wrap break-words">{String(value ?? "")}</dd></div>)}
        </dl>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="c-button-sub px-4 py-2" disabled={pending} onClick={() => { setReview(null); setResult(undefined); }}>もどってなおす</button>
          <button type="submit" className="c-button-main px-4 py-2" disabled={pending}>{pending ? "処理中…" : submit}</button>
        </div>
      </div>}
      {result && ("error" in result
        ? <p className="my-2 text-sm text-red-700" role="alert">{result.error}</p>
        : <p className="my-2 text-sm" role="status">{result.message}</p>)}
    </form>
  );
}

export function ConstructionAreas({ label, initial = [] }: { label: string; initial?: string[] }) {
  const [areas, setAreas] = useState<readonly string[]>(initial);
  return (
    <div className="sn">
      <details className="border-y py-2">
        <summary className="cursor-pointer py-1 text-sm font-bold">
          {label} <span className="c-muted">{areaText(areas, 2) || "選択する"}</span>
        </summary>
        <div className="pt-2"><AreaPicker areas={areas} onChange={setAreas} /></div>
      </details>
      {areas.map((area) => <input type="hidden" name="area" value={area} key={area} />)}
    </div>
  );
}


export function ConstructionDeadline({ min }: { min: string }) {
  const [date, setDate] = useState("");
  return <>
    <DateInput value={date} onChange={setDate} label="返事の期限" min={min} />
    <input type="hidden" name="deadline" value={date} />
  </>;
}
