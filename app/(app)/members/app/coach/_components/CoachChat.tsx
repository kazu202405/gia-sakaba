"use client";

// 紹介コーチ chat の本体（クライアント）。
// Phase C: /api/coach/chat へ POST して OpenAI streaming で受信。
//   サーバ側で referral_worksheets と applicants を読み込み、system prompt に注入する。
//
// UI 方針: Linear AI / Notion AI 風の subtle bubble。
//   - assistant: 左寄せ、✦ 小アイコン + 白背景カード（border-gray-200）
//   - user:      右寄せ、navy 背景の角丸 bubble
//   - typing indicator: streaming 開始までの "…" アニメーション
//   - 入力エリア: sticky bottom、textarea オートグロウ、IME 対応
//
// 履歴方針:
//   同一セッション中のみ React state で保持。リロード / 遷移で消える（MVP）。
//   後で localStorage / Supabase に格上げ予定。
//
// 初回 greeting メッセージはサーバには送らず、クライアント表示のみ
//   （system prompt で人格を毎回作るので重複させる必要なし）。

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { Sparkles, ArrowUp, ClipboardList, Link2, Link2Off, RotateCcw, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { COACH_GREETING } from "@/lib/coach/greeting";

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

type Role = "assistant" | "user";

interface Message {
  id: string;
  role: Role;
  content: string;
}

interface Props {
  initialName: string | null;
  /** owner テナント（右腕AI 22DB）を持っているか。false ならトグル非表示。 */
  linkAvailable?: boolean;
  /** 連携トグルの初期状態（DB の coach_link_enabled）。 */
  linkEnabled?: boolean;
  /** 履歴の持ち方：server=Supabase永続（4,980円）/ local=端末保存（990円）。 */
  persistMode?: "server" | "local";
  /** server モードの初期履歴（Supabase から復元済み）。 */
  initialHistory?: HistoryMessage[];
  /** local モードの保存キー（ユーザー単位）。 */
  storageKey?: string;
}

const GREETING_ID = "greeting";

// クイックアクション（連携ONの会員向け）。設計×現場のコーチングを発火させる定型文。
const QUICK_PROMPTS: { label: string; message: string }[] = [
  {
    label: "🔁 今週の振り返り",
    message:
      "今週の振り返りをお願いします。最近接点を持った相手と私の設計（ワークシート）を突き合わせて、ボトルネックに効く問いを1つ投げてください。",
  },
  {
    label: "📌 今月の紹介状況",
    message:
      "今月、紹介を頼んだ・与えた・生まれた数はどうなっていますか？ 設計と行動が噛み合っているか、次の一手を教えてください。",
  },
  {
    label: "🛠 サービスを磨く",
    message:
      "私のサービス・商品を1つ取り上げて、USP（他との違い）・あなたから買う理由・紹介しやすい一言を、価値設計のレンズで磨いてください。",
  },
  {
    label: "📈 刺さり方を振り返る",
    message:
      "これまでの私の報告をもとに、どの言い方（ストーリー・USP・紹介の一言など）が刺さって、どれがスルーされているか振り返ってください。勝ちパターンは固定、刺さらないものは修正案を1つください。",
  },
];

export function CoachChat({
  initialName,
  linkAvailable = false,
  linkEnabled = false,
  persistMode = "local",
  initialHistory = [],
  storageKey,
}: Props) {
  const greetingMsg: Message = {
    id: GREETING_ID,
    role: "assistant",
    content: COACH_GREETING(initialName),
  };

  const [messages, setMessages] = useState<Message[]>(() => [
    greetingMsg,
    // server モードは Supabase 履歴を初期表示（990円=local は空、後で端末から復元）
    ...initialHistory.map((m, i) => ({
      id: `h-${i}`,
      role: m.role,
      content: m.content,
    })),
  ]);
  const [input, setInput] = useState("");
  // streaming 中はユーザー送信をブロック（次の送信は前の応答完了後）
  const [isStreaming, setIsStreaming] = useState(false);
  // IME 変換中は Enter で送信しない
  const [isComposing, setIsComposing] = useState(false);
  // 右腕AI 連携トグル（楽観更新 + 失敗時ロールバック）
  const [isLinked, setIsLinked] = useState(linkEnabled);
  const [linkSaving, setLinkSaving] = useState(false);

  const toggleLink = async () => {
    if (linkSaving) return;
    const next = !isLinked;
    setIsLinked(next); // 楽観更新
    setLinkSaving(true);
    try {
      const res = await fetch("/api/coach/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error("[CoachChat] 連携トグル更新失敗:", err);
      setIsLinked(!next); // ロールバック
    } finally {
      setLinkSaving(false);
    }
  };

  // ─── 会話リセット ─────────────────────────────────────
  const [resetConfirming, setResetConfirming] = useState(false);
  // local は端末復元が終わるまで保存しない（空で上書きしないため）。server は復元不要なので最初から true。
  const didRestore = useRef(persistMode !== "local");

  const resetChat = async () => {
    if (isStreaming) return;
    setMessages([greetingMsg]);
    setResetConfirming(false);
    if (persistMode === "local") {
      if (storageKey) {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          /* noop */
        }
      }
    } else {
      try {
        await fetch("/api/coach/reset", { method: "POST" });
      } catch (err) {
        console.error("[CoachChat] リセット失敗:", err);
      }
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // local モード：マウント時に端末から会話を復元
  useEffect(() => {
    if (persistMode !== "local" || !storageKey) {
      didRestore.current = true;
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages([
            greetingMsg,
            ...parsed
              .filter(
                (m: unknown): m is HistoryMessage =>
                  !!m &&
                  typeof (m as HistoryMessage).content === "string" &&
                  ((m as HistoryMessage).role === "user" ||
                    (m as HistoryMessage).role === "assistant"),
              )
              .map((m, i) => ({ id: `r-${i}`, role: m.role, content: m.content })),
          ]);
        }
      }
    } catch {
      /* noop */
    }
    didRestore.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // local モード：会話の変化を端末へ保存（復元完了後のみ）
  useEffect(() => {
    if (persistMode !== "local" || !storageKey || !didRestore.current) return;
    const toSave = messages
      .filter((m) => m.id !== GREETING_ID)
      .map((m) => ({ role: m.role, content: m.content }));
    try {
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch {
      /* noop */
    }
  }, [messages, persistMode, storageKey]);

  // メッセージ追加・streaming 変化のたびに最下部へ
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  // textarea オートグロウ（最大 200px）
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  const send = async (override?: string) => {
    const trimmed = (override ?? input).trim();
    if (!trimmed || isStreaming) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    const assistantId = `a-${Date.now()}`;
    const assistantSeed: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    // ユーザー発話を即時追加 + 空の assistant 行を確保
    setMessages((prev) => [...prev, userMsg, assistantSeed]);
    if (!override) setInput("");
    setIsStreaming(true);

    // greeting は API に送らない（毎回 system prompt で人格を構築）
    const apiMessages = [
      ...messages
        .filter((m) => m.id !== GREETING_ID)
        .map((m) => ({ role: m.role, content: m.content })),
      { role: userMsg.role, content: userMsg.content },
    ];

    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // 受け取ったぶんだけ assistant メッセージを更新
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: buffer } : m,
          ),
        );
      }
    } catch (err) {
      console.error("[CoachChat] stream error:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "応答の取得中に問題が発生しました。少し時間をおいて、もう一度お試しください。",
              }
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 送信 / Shift+Enter 改行 / IME 中は無視
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* ─── ヘッダー（sticky） ─────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" aria-hidden />
            <h1 className="text-base font-bold tracking-tight text-gray-900">
              紹介コーチ
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            {linkAvailable && (
              <button
                type="button"
                onClick={toggleLink}
                disabled={linkSaving}
                aria-pressed={isLinked}
                title={
                  isLinked
                    ? "右腕AIのデータ（人脈・接点・タスク）を読み込んで相談に反映しています"
                    : "右腕AIのデータと連携していません（ワークシートのみで相談）"
                }
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50",
                  isLinked
                    ? "text-teal-700 bg-teal-50 hover:bg-teal-100"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100",
                )}
              >
                {isLinked ? (
                  <Link2 className="w-3 h-3" aria-hidden />
                ) : (
                  <Link2Off className="w-3 h-3" aria-hidden />
                )}
                {isLinked ? "右腕AI連携 ON" : "右腕AI連携 OFF"}
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                resetConfirming ? void resetChat() : setResetConfirming(true)
              }
              onBlur={() => setResetConfirming(false)}
              disabled={isStreaming}
              title="この会話をリセットして最初から始める"
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors disabled:opacity-40",
                resetConfirming
                  ? "text-white bg-[#8a4538] hover:bg-[#6f3328]"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100",
              )}
            >
              <RotateCcw className="w-3 h-3" aria-hidden />
              {resetConfirming ? "リセットする？" : "リセット"}
            </button>
            <Link
              href="/members/app/worksheet"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <ClipboardList className="w-3 h-3" aria-hidden />
              設計を編集
            </Link>
          </div>
        </div>
      </header>

      {/* 990円のみ：このコーチは記憶しないことを伝え、アップグレードへ誘導。
          4,980円（server）は覚えていて当然なので説明バーは出さない。 */}
      {persistMode === "local" && (
        <div className="bg-amber-50/60 border-b border-amber-100 px-4 lg:px-6 py-1.5">
          <p className="max-w-3xl mx-auto text-[11px] text-amber-900/80 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>現在のプランでは、過去の相談は引き継げません。</span>
            {/* 2026-08-10: 右腕AIの提供を停止し /services/ai を閉じたため、
                会員のご案内へ向け替えた（そのままだと404に飛ぶ）。 */}
            <Link
              href="/upgrade"
              className="inline-flex items-center gap-0.5 font-bold text-[#8a5a1c] hover:text-[#6f4715] underline underline-offset-2"
            >
              会員のご案内を見る
              <ArrowRight className="w-3 h-3" aria-hidden />
            </Link>
          </p>
        </div>
      )}

      {/* ─── メッセージ一覧 ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 space-y-6">
          {messages.map((m) => (
            <MessageRow key={m.id} role={m.role} content={m.content} />
          ))}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* ─── 入力エリア（sticky bottom） ────────────────────── */}
      <div className="sticky bottom-0 bg-gray-50/80 backdrop-blur border-t border-gray-200">
        {/* クイックアクション：連携ON会員向け。設計×現場の振り返りをワンタップで発火。 */}
        {linkAvailable && isLinked && !isStreaming && (
          <div className="max-w-3xl mx-auto px-4 lg:px-6 pt-3 flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => void send(q.message)}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium text-gray-600 bg-white border border-gray-200 hover:border-gray-300 hover:text-gray-900 transition-colors"
              >
                {q.label}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={onSubmit}
          className="max-w-3xl mx-auto px-4 lg:px-6 py-3 lg:py-4"
        >
          <div className="relative flex items-end gap-2 bg-white border border-gray-300 rounded-2xl shadow-sm focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-300 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="紹介の悩みを書いてみてください..."
              rows={1}
              className="flex-1 resize-none bg-transparent px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none max-h-[200px]"
              disabled={isStreaming}
            />
            <button
              type="submit"
              aria-label="送信"
              disabled={!input.trim() || isStreaming}
              className={cn(
                "shrink-0 inline-flex items-center justify-center w-9 h-9 m-1.5 rounded-xl transition-colors",
                input.trim() && !isStreaming
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed",
              )}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-gray-400 text-center">
            Enter で送信 / Shift + Enter で改行
          </p>
        </form>
      </div>
    </div>
  );
}

// ─── メッセージ行 ─────────────────────────────────────────

// チャットは Markdown をレンダリングしないので、AI が出した記号がそのまま
// 表示されて読みにくい。表示直前に軽く整える（保険。本来はプロンプトで抑制）。
//   ** （太字）→ 除去 / 行頭 -,*,+ → ・ / 行頭 # 見出し → 除去
function stripChatMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/(^|\n)[ \t]*[-*+] /g, "$1・")
    .replace(/(^|\n)#{1,6}\s+/g, "$1");
}

function MessageRow({ role, content }: { role: Role; content: string }) {
  if (role === "assistant") {
    // 空 content = streaming 開始直後（最初の delta 待ち）→ dots アニメ
    const isWaiting = content.length === 0;
    return (
      <div className="flex gap-3">
        <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 border border-amber-200 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-gray-500 mb-1.5 tracking-wide">
            紹介コーチ
          </p>
          <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] inline-block">
            {isWaiting ? (
              <span className="flex gap-1 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
              </span>
            ) : (
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {stripChatMarkdown(content)}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // user
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] bg-slate-900 text-white rounded-2xl rounded-tr-sm px-4 py-2.5">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

