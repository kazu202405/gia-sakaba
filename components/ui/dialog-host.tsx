"use client";

// アプリ内モーダル／トーストの描画。app/layout.tsx に1つだけ置く。
// 呼び出し側のAPIは lib/ui-dialog.ts（uiConfirm / uiAlert / uiPrompt / uiToast）。
//
// 依存ライブラリなしで実装している（このリポジトリには Dialog も Toast も無い）。
// Esc・背景クリックで閉じる／Enterで決定／開いている間は背面をスクロールさせない。
//
// ⚠️ 中身（入力途中の文字・エラー表示）は DialogCard 側の state に持ち、
//    要求ごとに key を変えて作り直す。ホスト側に持って useEffect で初期化すると、
//    前の入力が次のモーダルに残る／effect内setStateでカスケード再描画になる。
//
// data-ui-* の目印は、画面ごとの着せ替え用（例：酒場は components/guild/guild-theme.css）。

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AlertTriangle, HelpCircle, Info, X } from "lucide-react";
import {
  dismissToast,
  getDialogQueue,
  getToasts,
  resolveTop,
  subscribeUiDialog,
  type DialogRequest,
  type ToastItem,
} from "@/lib/ui-dialog";

const EMPTY_QUEUE: DialogRequest[] = [];
const EMPTY_TOASTS: ToastItem[] = [];

export function UiDialogHost() {
  const queue = useSyncExternalStore(subscribeUiDialog, getDialogQueue, () => EMPTY_QUEUE);
  const toasts = useSyncExternalStore(subscribeUiDialog, getToasts, () => EMPTY_TOASTS);
  const current = queue[0];

  return (
    <>
      {current && <DialogCard key={current.id} request={current} />}

      {/* トースト：画面の下・中央（親指の届く所。「もどす」を押しやすい）。押さなくても消える。
          下に固定メニューがある画面は --ui-toast-bottom でその上に逃がす（例：酒場は guild-theme.css） */}
      <div className="fixed bottom-[calc(var(--ui-toast-bottom,1.5rem)+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[110] flex flex-col items-center gap-2 pointer-events-none w-max max-w-[92vw]">
        {toasts.map((t) => {
          const className =
            "pointer-events-auto rounded-full px-4 py-2.5 text-[13px] leading-snug text-white shadow-lg whitespace-pre-line " +
            (t.kind === "error" ? "bg-red-600" : t.kind === "info" ? "bg-slate-700" : "bg-gray-900");
          // ボタン付きは、ボタンの中にボタンを入れられないので 枠を div にする
          if (t.action) {
            const action = t.action;
            return (
              <div key={t.id} data-ui-toast data-kind={t.kind} role="status" className={className + " flex items-center gap-3"}>
                <span>{t.message}</span>
                <button
                  type="button"
                  data-ui-toast-action
                  onClick={() => {
                    action.onClick();
                    dismissToast(t.id);
                  }}
                  className="shrink-0 -my-1 px-2 py-1 font-semibold underline underline-offset-4"
                >
                  {action.label}
                </button>
                {/* ボタン付きは 枠を押しても消えないので、閉じる所を別に出す（出しっぱなしが気になる人用） */}
                <button
                  type="button"
                  data-ui-toast-close
                  aria-label="この知らせを 閉じる"
                  onClick={() => dismissToast(t.id)}
                  className="-mr-3 -my-3 shrink-0 px-3 py-3 text-lg leading-none opacity-70"
                >
                  ×
                </button>
              </div>
            );
          }
          return (
            <button key={t.id} data-ui-toast data-kind={t.kind} onClick={() => dismissToast(t.id)} className={className}>
              {t.message}
            </button>
          );
        })}
      </div>
    </>
  );
}

function DialogCard({ request }: { request: DialogRequest }) {
  const isPrompt = request.kind === "prompt";
  const [draft, setDraft] = useState(isPrompt ? request.options.value ?? "" : "");
  const [inputError, setInputError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  const finish = useCallback(
    (result: boolean | string | null) => {
      if (request.kind === "confirm") request.resolve(result === true);
      else if (request.kind === "alert") request.resolve();
      else request.resolve(typeof result === "string" ? result : null);
      resolveTop();
    },
    [request],
  );

  const submitPrompt = useCallback(() => {
    const value = draft.trim();
    // 空のまま押せてしまうと「押したのに何も起きない」になる。理由をその場に出す。
    if (!value) {
      setInputError("入力してください");
      inputRef.current?.focus();
      return;
    }
    finish(value);
  }, [draft, finish]);

  // alert は「閉じる」しかないので、背景クリックやEscも完了として返す
  const cancel = useCallback(() => finish(isPrompt ? null : false), [finish, isPrompt]);

  // 開いたら操作対象にフォーカスを当てる（DOMの副作用。stateは触らない）
  useEffect(() => {
    if (isPrompt) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      okRef.current?.focus();
    }
  }, [isPrompt]);

  // 開いている間は背面をスクロールさせない
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancel]);

  const danger =
    request.kind === "confirm" || request.kind === "alert" ? request.options.danger === true : false;

  const title =
    request.options.title ??
    (request.kind === "confirm" ? "確認" : request.kind === "alert" ? "お知らせ" : "入力してください");

  const okLabel =
    request.options.okLabel ??
    (request.kind === "confirm" ? "実行する" : request.kind === "alert" ? "閉じる" : "保存");

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={cancel} aria-hidden />
      <div
        role={request.kind === "alert" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="ui-dialog-title"
        data-ui-dialog-card
        className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6 sm:p-7"
      >
        <button
          onClick={cancel}
          aria-label="閉じる"
          data-ui-dialog-close
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0">
            {danger ? (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            ) : request.kind === "alert" ? (
              <Info className="w-5 h-5 text-amber-500" />
            ) : (
              <HelpCircle className="w-5 h-5 text-amber-500" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="ui-dialog-title"
              className="text-base font-bold text-gray-900 pr-6"
              style={{ fontFamily: "'Noto Serif JP', serif" }}
            >
              {title}
            </h2>

            {request.kind === "prompt" ? (
              <>
                {request.options.note && (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500 whitespace-pre-line">
                    {request.options.note}
                  </p>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={draft}
                  maxLength={request.options.maxLength ?? 60}
                  placeholder={request.options.placeholder ?? ""}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    if (inputError) setInputError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitPrompt();
                    }
                  }}
                  className="mt-3 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
                <p className="mt-1.5 min-h-[1rem] text-xs text-red-600">{inputError}</p>
              </>
            ) : (
              <p className="mt-1.5 text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                {request.options.message}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          {request.kind !== "alert" && (
            <button
              onClick={cancel}
              data-ui-dialog-cancel
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              {request.kind === "confirm" ? request.options.cancelLabel ?? "キャンセル" : "キャンセル"}
            </button>
          )}
          <button
            ref={okRef}
            onClick={() => (isPrompt ? submitPrompt() : finish(true))}
            data-ui-dialog-ok
            data-danger={danger}
            className={
              "px-5 py-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 " +
              (danger ? "bg-red-600" : "bg-gray-900")
            }
          >
            {okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
