"use client";

// 紹介設計ワークシート 入力エディタ（クライアント本体）。
// Phase B: Supabase テーブル `referral_worksheets` に upsert 保存（debounce 800ms）。
//
// UI 方針:
//   - 3タブ（WS01 / WS02 / WS03）で分割。各タブ内は項目縦並びの textarea + ヒント。
//   - 上部にシート別の進捗ピル。
//   - 「コーチに相談する」CTA を最下部に置き、coach chat への動線を作る。
//   - GIA Editorial 寄り（Noto Serif JP 見出し、navy 基調）+ shadcn 風の余白。
//
// 永続化:
//   - Server Component (page.tsx) が SSR 時に SELECT で初期値を取り、initialData で渡す
//   - Client 側で編集後、debounce 800ms で Supabase へ upsert
//   - 失敗時は「保存失敗」バッジを出し、次回入力時に再 upsert を試みる

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { WorksheetAssistDialog } from "./WorksheetAssistDialog";
import {
  ClipboardList,
  Sparkles,
  Save,
  CheckCircle2,
  Circle,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  WORKSHEETS,
  calcProgress,
  calcSheetProgress,
  type Worksheet,
  type WorksheetData,
} from "@/lib/coach/worksheet-schema";
import { saveWorksheet } from "@/lib/coach/worksheet-storage";

const SAVE_DEBOUNCE_MS = 800;

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface Props {
  userId: string;
  initialData: WorksheetData;
}

export function WorksheetEditor({ userId, initialData }: Props) {
  const [activeSheet, setActiveSheet] = useState<Worksheet["id"]>("ws01");
  const [data, setData] = useState<WorksheetData>(initialData);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // 初回レンダー時に走らないよう、初回マウントを skip するフラグ
  const isFirstRender = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = useMemo(() => createClient(), []);

  // データ変更時に Supabase へ debounce upsert
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const result = await saveWorksheet(supabase, userId, data);
      if (result.ok) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 1500);
      } else {
        setSaveStatus("error");
      }
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data, supabase, userId]);

  const overallProgress = useMemo(() => calcProgress(data), [data]);

  const onChange = (fieldId: string, value: string) => {
    setData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const currentSheet = WORKSHEETS.find((w) => w.id === activeSheet)!;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── ヘッダー ───────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
          {/* マイページへの戻り導線（mypage/edit と同パターン） */}
          <div className="mb-4">
            <Link
              href="/members/app/mypage"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
              マイページへ戻る
            </Link>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-gray-400 uppercase mb-2">
                <ClipboardList className="w-3.5 h-3.5" aria-hidden />
                Referral Design
              </div>
              <h1
                className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight"
                style={{ fontFamily: "'Noto Serif JP', serif" }}
              >
                紹介設計ワークシート
              </h1>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                自社のことを 22 項目に書き出すと、紹介コーチがあなたの状況に合わせて答えます。
                <br />
                完璧でなくて大丈夫。書いた分だけ、コーチの精度が上がります。
              </p>
            </div>
            <SaveBadge status={saveStatus} />
          </div>

          {/* 全体進捗バー */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span className="font-semibold tracking-wide">全体の記入</span>
              <span>{Math.round(overallProgress * 100)}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-900 transition-all duration-500"
                style={{ width: `${overallProgress * 100}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ─── タブ ───────────────────────────────────────── */}
      <nav className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 lg:px-8">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {WORKSHEETS.map((ws) => {
              const { filled, total } = calcSheetProgress(ws.id, data);
              const isActive = activeSheet === ws.id;
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => setActiveSheet(ws.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2",
                    isActive
                      ? "text-slate-900 border-slate-900"
                      : "text-gray-500 border-transparent hover:text-slate-900",
                  )}
                >
                  <span
                    className={cn(
                      "text-[11px] font-bold tracking-[0.15em]",
                      isActive ? "text-amber-500" : "text-gray-400",
                    )}
                  >
                    WS{ws.number}
                  </span>
                  <span>{ws.title}</span>
                  <span
                    className={cn(
                      "ml-1 text-[11px] font-medium tabular-nums",
                      filled === total
                        ? "text-emerald-600"
                        : "text-gray-400",
                    )}
                  >
                    {filled}/{total}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ─── シート本体 ──────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 lg:px-8 py-8 lg:py-10">
        <SheetHeader sheet={currentSheet} />

        <div className="mt-6 space-y-5">
          {currentSheet.fields.map((f) => {
            const value = data[f.id] ?? "";
            const isFilled = value.trim().length > 0;
            return (
              <div
                key={f.id}
                className="bg-white border border-gray-200 rounded-2xl p-5 lg:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-gray-300 transition-colors"
              >
                <div className="flex items-baseline gap-3 mb-2">
                  <span
                    className={cn(
                      "shrink-0 text-xs font-bold tracking-[0.15em]",
                      isFilled ? "text-amber-500" : "text-gray-400",
                    )}
                  >
                    {f.num}
                  </span>
                  <label
                    htmlFor={f.id}
                    className="text-base font-bold text-slate-900 leading-tight"
                  >
                    {f.label}
                  </label>
                  {isFilled ? (
                    <CheckCircle2
                      className="ml-auto shrink-0 w-4 h-4 text-emerald-500"
                      aria-label="記入済み"
                    />
                  ) : (
                    <Circle
                      className="ml-auto shrink-0 w-4 h-4 text-gray-300"
                      aria-label="未記入"
                    />
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                  {f.hint}
                </p>
                <p className="mb-3 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-amber-800">
                  <span className="mr-1 inline-block rounded bg-amber-500 px-1 py-0.5 text-[9px] font-bold text-white">
                    例
                  </span>
                  {f.example}
                </p>
                <textarea
                  id={f.id}
                  value={value}
                  onChange={(e) => onChange(f.id, e.target.value)}
                  rows={3}
                  placeholder="ここに書く..."
                  className="w-full resize-y bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-colors min-h-[88px]"
                />
                <WorksheetAssistDialog
                  fieldId={f.id}
                  fieldLabel={f.label}
                  currentValue={value}
                  onApply={(t) => onChange(f.id, t)}
                />
              </div>
            );
          })}
        </div>

        {/* 完成基準コメント */}
        <p className="mt-5 text-xs text-gray-500 text-center px-4 leading-relaxed">
          ※ {currentSheet.closingNote}
        </p>

        {/* タブ切替フッター（次のシートへ / コーチへ） */}
        <FooterCTA
          activeSheet={activeSheet}
          onChangeSheet={setActiveSheet}
          progress={overallProgress}
        />
      </main>

      {/* 保存スナックバー（saved / error の遷移時にだけ画面下部にポップアップ） */}
      <SaveSnackbar status={saveStatus} />
    </div>
  );
}

// ─── パーツ ─────────────────────────────────────────────

function SheetHeader({ sheet }: { sheet: Worksheet }) {
  return (
    <div className="border-l-4 border-slate-900 pl-4 lg:pl-5">
      <div className="text-[11px] font-bold tracking-[0.22em] text-amber-500">
        WORKSHEET {sheet.number}
      </div>
      <h2
        className="mt-1 text-xl lg:text-2xl font-bold text-slate-900 tracking-tight"
        style={{ fontFamily: "'Noto Serif JP', serif" }}
      >
        {sheet.title}
      </h2>
      <p className="mt-1 text-sm text-gray-600">{sheet.subtitle}</p>
      <p className="mt-2 inline-block rounded-lg bg-amber-50 border border-amber-100 px-3 py-1.5 text-[12px] leading-relaxed text-amber-800">
        {sheet.payoff}
      </p>
    </div>
  );
}

// 保存スナックバー：
// - status が "saved" / "error" に変わった瞬間に表示し、2秒後にフェードアウト
// - 既存の SaveBadge（ヘッダー右）は残し、ステータスの常時表示はそのまま
// - 画面下部固定なので、textarea で書き続けてる人にも視認できる
function SaveSnackbar({ status }: { status: SaveStatus }) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status === "saved" || status === "error") {
      setVisible(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setVisible(false), 2000);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [status]);

  // 表示しない時は DOM ごと出さない（aria-live は role="status" を維持）
  if (!visible) return null;

  const isError = status === "error";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "inline-flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-semibold",
        "transition-all duration-300",
        isError
          ? "bg-red-50 border border-red-200 text-red-700"
          : "bg-slate-900 text-white",
      )}
    >
      {isError ? (
        <>
          <AlertCircle className="w-4 h-4" aria-hidden />
          保存に失敗しました
        </>
      ) : (
        <>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden />
          保存しました
        </>
      )}
    </div>
  );
}

function SaveBadge({ status }: { status: SaveStatus }) {
  if (status === "idle") {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-gray-400 px-2.5 py-1 rounded-full border border-gray-200 whitespace-nowrap">
        <Save className="w-3 h-3" aria-hidden />
        自動保存
      </span>
    );
  }
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 px-2.5 py-1 rounded-full bg-gray-100 whitespace-nowrap">
        <Save className="w-3 h-3 animate-pulse" aria-hidden />
        保存中...
      </span>
    );
  }
  if (status === "error") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[11px] text-red-700 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 whitespace-nowrap"
        role="alert"
      >
        <AlertCircle className="w-3 h-3" aria-hidden />
        保存失敗（再入力で再試行）
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 whitespace-nowrap">
      <CheckCircle2 className="w-3 h-3" aria-hidden />
      保存しました
    </span>
  );
}

function FooterCTA({
  activeSheet,
  onChangeSheet,
  progress,
}: {
  activeSheet: Worksheet["id"];
  onChangeSheet: (id: Worksheet["id"]) => void;
  progress: number;
}) {
  const idx = WORKSHEETS.findIndex((w) => w.id === activeSheet);
  const next = WORKSHEETS[idx + 1];

  return (
    <div className="mt-10 pt-8 border-t border-gray-200">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {next ? (
          <button
            type="button"
            onClick={() => onChangeSheet(next.id)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-slate-900 hover:bg-gray-50 hover:border-gray-400 transition-colors"
          >
            次のシートへ：{next.title}
            <ArrowRight className="w-4 h-4" aria-hidden />
          </button>
        ) : (
          <div className="text-sm text-gray-500">
            これで全 3 シートです。記入は何度でも見直せます。
          </div>
        )}

        <Link
          href="/members/app/coach"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-amber-300" aria-hidden />
          紹介コーチに相談する
          <ArrowRight className="w-4 h-4" aria-hidden />
        </Link>
      </div>
      {progress < 0.3 && (
        <p className="mt-3 text-xs text-gray-500 text-center sm:text-right">
          ※ 1〜2項目だけでも書くと、コーチの応答が変わります
        </p>
      )}
    </div>
  );
}
