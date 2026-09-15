"use client";

// 右腕AI Web チャット UI。/api/clone/chat に投げて generateReply の応答を表示する。
// Slack/LINE と同じエンジンなので、質問・記録（名刺:/議事録:/振り返り: 等）・
// コマンド（紹介連携オン/オフ 等）がそのまま使える。
// 履歴はこのセッション内のみ（リロードで消える）＝Slack/LINE と同じく1メッセージ単位の挙動。

import { useEffect, useRef, useState } from "react";
import {
  Send,
  Loader2,
  AlertCircle,
  BookOpen,
  ChevronDown,
} from "lucide-react";

// チャットで使える操作の一覧（handleHelp と対応。Webでは見やすくグループ表示）。
const COMMAND_GROUPS: { title: string; items: string[] }[] = [
  {
    title: "質問・相談（そのまま入力）",
    items: [
      "今、何を優先して動くべき？",
      "Aさんと最近何を話した？",
      "今のタスク教えて",
    ],
  },
  {
    title: "記録する（先頭にキーワード）",
    items: [
      "名刺: 山田太郎 ABC商事、勉強会で会った → 人物を登録",
      "議事録: 会議名＋内容 → 会話ログに保存",
      "振り返り: 今日の気づき → 日記に保存",
      "備考: Aさんは既存重視 → 人物メモ",
      "リマインド: 6/10までに請求書 / 田中さん誕生日 3/29 毎年",
    ],
  },
  {
    title: "そのまま書くだけ（プレフィックス不要）",
    items: [
      "Aさんと打合せ、紹介の話 → 会話ログ",
      "Aさんにサロン提案した／Aさんがアプリ受注した 30万 → ファネル更新",
      "資料作る（明日まで）→ タスク／金曜の請求書 完了 → 完了",
    ],
  },
  {
    title: "コマンド",
    items: [
      "紹介連携オン／紹介連携オフ → 紹介設計を踏まえるか切替",
      "? または ヘルプ → コマンド一覧を表示",
    ],
  },
];

interface ChatMessage {
  role: "user" | "assistant" | "error";
  content: string;
}

const EXAMPLES = [
  "今、何を優先して動くべき？",
  "今のタスク教えて",
  "名刺: 山田太郎 ABC商事、勉強会で会った",
];

export function CloneChat({ slug }: { slug: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 新規メッセージ・送信中で最下部へ
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, pending]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || pending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setPending(true);
    try {
      const res = await fetch("/api/clone/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, message }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
      };
      if (!res.ok || !data.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "error", content: data.error ?? "応答の取得に失敗しました" },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply! },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "error", content: "通信に失敗しました。少し待って再送してください。" },
      ]);
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter で送信 / Shift+Enter で改行（IME 変換確定中は送信しない）
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
      {/* 使えること・コマンド一覧（開閉式） */}
      <div className="border-b border-gray-100">
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          aria-expanded={showHelp}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
        >
          <BookOpen className="h-4 w-4 flex-shrink-0 text-[#a9772b]" />
          <span className="text-[13px] font-bold tracking-wide text-[#1c3550]">
            使えること・コマンド一覧
          </span>
          <ChevronDown
            className={`ml-auto h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${
              showHelp ? "rotate-180" : ""
            }`}
          />
        </button>
        {showHelp && (
          <div className="space-y-3 border-t border-gray-100 bg-[#fbf7ee] px-4 py-3">
            {COMMAND_GROUPS.map((g) => (
              <div key={g.title}>
                <p className="mb-1 text-[11px] font-bold tracking-wide text-[#7a5618]">
                  {g.title}
                </p>
                <ul className="space-y-0.5">
                  {g.items.map((it) => (
                    <li
                      key={it}
                      className="text-[12px] leading-relaxed text-gray-600"
                    >
                      ・{it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-gray-400">
              ※ Slack / LINE と同じ右腕AIです。ここで入れた記録もそのまま蓄積されます。
            </p>
          </div>
        )}
      </div>

      {/* メッセージ表示 */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="mx-auto max-w-md py-8 text-center">
            <p className="font-serif text-base text-[#1c3550]">
              右腕AIに話しかけてみてください
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-gray-500">
              質問・相談はもちろん、「名刺:」「議事録:」「振り返り:」で記録、
              <br />
              「紹介連携オン/オフ」などのコマンドも使えます。
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => send(ex)}
                  disabled={pending}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[12px] text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          if (m.role === "user") {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-[#1c3550] px-3.5 py-2 text-sm leading-relaxed text-white">
                  {m.content}
                </div>
              </div>
            );
          }
          if (m.role === "error") {
            return (
              <div key={i} className="flex justify-start">
                <div className="flex max-w-[85%] items-start gap-2 rounded-2xl rounded-bl-sm border border-[#d8c4be] bg-[#f3e9e6] px-3.5 py-2 text-[13px] text-[#8a4538]">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>{m.content}</span>
                </div>
              </div>
            );
          }
          return (
            <div key={i} className="flex justify-start">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm leading-relaxed text-gray-800">
                {m.content}
              </div>
            </div>
          );
        })}

        {pending && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-sm border border-gray-200 bg-gray-50 px-3.5 py-2 text-[13px] text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              考えています…
            </div>
          </div>
        )}
      </div>

      {/* 入力 */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 border-t border-gray-200 px-3 py-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="メッセージを入力（Enterで送信 / Shift+Enterで改行）"
          className="max-h-40 min-h-[42px] flex-1 resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-[#1c3550] focus:outline-none focus:ring-1 focus:ring-[#1c3550]/10"
        />
        <button
          type="submit"
          disabled={pending || input.trim().length === 0}
          className="inline-flex h-[42px] items-center gap-1.5 rounded-md bg-[#1c3550] px-4 text-xs font-bold tracking-[0.06em] text-white transition-colors hover:bg-[#0f2238] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          送信
        </button>
      </form>
    </div>
  );
}
