"use client";

import { useRef, useState, useTransition } from "react";
import { DateInput } from "@/components/guild/form-parts";
import { useGuildRouter } from "@/components/guild/use-guild-router";
import { areaText, INDUSTRIES, POST_CATEGORIES, POST_VISIBILITIES, PREFECTURES, REGION_NAMES, type Industry, type PostCategory } from "@/lib/guild/look/sns-mock";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
import { PostAreaDialog, PostChoiceDialog, PostSelectRow, PostSelectionDialog } from "@/components/guild/look/sns/post-picker";
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
        if (!fields.get("category") || !fields.get("industry") || !fields.getAll("area").length) {
          setResult({ error: "カテゴリー、業種、地域を選んでください。" });
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
      <fieldset className="min-w-0 space-y-4" disabled={pending} hidden={Boolean(review)}>
        {children}
        {reviewPost ? <div className="sn-post-review-actions">
          <button type="submit" className="sn-btn sn-btn--main sn-btn--wide" disabled={pending}>{pending ? "処理中…" : "内容を確かめる"}</button>
        </div> : <button type="submit" className="sn-btn sn-btn--main" disabled={pending}>{pending ? "処理中…" : submit}</button>}
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
          <button type="button" className="sn-btn" disabled={pending} onClick={() => { setReview(null); setResult(undefined); }}>もどってなおす</button>
          <button type="submit" className="sn-btn sn-btn--main" disabled={pending}>{pending ? "処理中…" : submit}</button>
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
  const [open, setOpen] = useState(false);
  return <>
    <PostSelectRow label={label} value={areaText(areas, 2)} onClick={() => setOpen(true)} />
    {areas.map((area) => <input type="hidden" name="area" value={area} key={area} />)}
    {open && <PostAreaDialog initial={areas} onApply={setAreas} onClose={() => setOpen(false)} />}
  </>;
}


export function ConstructionDeadline({ min }: { min: string }) {
  const [date, setDate] = useState("");
  return <>
    <DateInput value={date} onChange={setDate} label="返事の期限" min={min} />
    <input type="hidden" name="deadline" value={date} />
  </>;
}

export function ConstructionPostSelections() {
  const [open, setOpen] = useState<"category" | "industry" | null>(null);
  const [category, setCategory] = useState<PostCategory>();
  const [industry, setIndustry] = useState<Industry>();
  return <div className="sn-post-select-fields">
    <PostSelectRow label="カテゴリー" value={POST_CATEGORIES.find((item) => item.key === category)?.label ?? ""} onClick={() => setOpen("category")} />
    <PostSelectRow label="探している業種" value={industry ?? ""} onClick={() => setOpen("industry")} />
    <div><ConstructionAreas label="探している地域" /></div>
    <input type="hidden" name="category" value={category ?? ""} />
    <input type="hidden" name="industry" value={industry ?? ""} />
    {open === "category" && <PostChoiceDialog title="カテゴリー" initial={category} choices={POST_CATEGORIES}
      applyLabel="決定する" onApply={setCategory} onClose={() => setOpen(null)} />}
    {open === "industry" && <PostChoiceDialog title="探している業種" initial={industry} choices={INDUSTRIES.map((item) => ({ key: item, label: item }))}
      applyLabel="決定する" onApply={setIndustry} onClose={() => setOpen(null)} />}
  </div>;
}

export function ConstructionHomeRegion({ base, value }: { base: string; value: string }) {
  const router = useGuildRouter();
  return <label className="sn-feed-area"><span className="sr-only">案件の地域</span><select key={value} defaultValue={value} onChange={(event) => {
    const region = event.target.value;
    router.push(region ? base + "?region=" + encodeURIComponent(region) : base);
  }}>
    <option value="">全国</option>
    {REGION_NAMES.map((item) => <option key={item} value={item}>{item}</option>)}
  </select></label>;
}

export function ConstructionPostFilters({ href, category, prefecture, count }: {
  href: string;
  category?: PostCategory;
  prefecture?: string;
  count: number;
}) {
  const [open, setOpen] = useState(false);
  const router = useGuildRouter();
  const form = useRef<HTMLFormElement>(null);
  const label = POST_CATEGORIES.find((item) => item.key === category)?.label;
  const filters = [label, prefecture].filter(Boolean).join("・");
  return <>
    <button type="button" className="sn-post-select-row sn-post-list-filter" aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <span className="sn-post-select-label"><SlidersHorizontal aria-hidden />絞り込み</span>
      <span className="sn-post-select-value" data-picked={Boolean(filters)}>{filters || "すべて"}・{count}件・近い順</span>
      <ChevronRight aria-hidden />
    </button>
    {open && <PostSelectionDialog title="案件の絞り込み" onClose={() => setOpen(false)}
      actions={<button type="button" className="sn-btn sn-btn--main sn-btn--wide" onClick={() => form.current?.requestSubmit()}>絞り込む</button>}>
      <form ref={form} className="sn-form-sec" onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        const params = new URLSearchParams();
        for (const field of ["category", "prefecture"]) {
          const value = values.get(field);
          if (typeof value === "string" && value) params.set(field, value);
        }
        setOpen(false);
        router.push(params.size ? href + "?" + params.toString() : href);
      }}>
        <label className="sn-field"><span>カテゴリー</span><select name="category" defaultValue={category ?? ""}>
          <option value="">すべて</option>{POST_CATEGORIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
        </select></label>
        <label className="sn-field"><span>都道府県</span><select name="prefecture" defaultValue={prefecture ?? ""}>
          <option value="">すべて</option>{PREFECTURES.map((item) => <option key={item}>{item}</option>)}
        </select></label>
      </form>
    </PostSelectionDialog>}
  </>;
}
