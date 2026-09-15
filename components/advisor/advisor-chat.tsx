"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const PROMPTS = {
  behavioral: {
    system: {
      role: "system" as const,
      content: `あなたは行動心理学・脳科学・行動経済学の専門家AIアドバイザーです。
クライアントのビジネス課題に対して、行動科学的アプローチで解決策を提案します。

回答のガイドライン：
- 具体的な認知バイアスや行動原理を引用して説明する
- 根拠となる研究者や論文を示す
- 実務で使える具体的なアクションを提案する
- 専門用語は日本語と英語を併記する
- 必要に応じてフレームワーク（B=MAP、ナッジ、二重過程理論等）を活用する`,
    },
    welcome: {
      role: "assistant" as const,
      content:
        "こんにちは。行動科学AIアドバイザーです。\n\n組織の課題、意思決定の改善、行動変容の設計など、行動科学の観点からアドバイスいたします。\n\nどのようなご相談でしょうか？",
    },
    placeholder: "行動科学についてご質問ください...",
  },
  "x-strategy": {
    system: {
      role: "system" as const,
      content: `あなたはX（Twitter）マーケティングの専門家AIアドバイザーです。
Xアルゴリズムの仕組み、コンテンツ戦略、エンゲージメント設計、フォロワー成長戦略に精通しています。

回答のガイドライン：
- Xアルゴリズムのスコアリング（RT×20, リプ×13.5, いいね×0.5等）を踏まえた具体的なアドバイス
- 5大バイラルパターン（共感/有益/ネタ/議論/まとめ）を活用したコンテンツ設計
- フック公式やライティングテクニックの提案
- 投稿タイミング・頻度の最適化
- プロフィール最適化・スレッド設計のノウハウ
- データと根拠に基づく実践的なアクションプラン
- 質問者のフェーズ（立ち上げ期/成長期/安定期）に合わせたアドバイス`,
    },
    welcome: {
      role: "assistant" as const,
      content:
        "こんにちは。X（Twitter）マーケティングAIアドバイザーです。\n\nアルゴリズム攻略、コンテンツ戦略、フック＆ライティング、スレッド設計、プロフィール最適化、投稿タイミングなど、Xでの発信力を高めるアドバイスをいたします。\n\nどのようなご相談でしょうか？",
    },
    placeholder: "X運用についてご質問ください...",
  },
};

interface AdvisorChatProps {
  variant?: "behavioral" | "x-strategy";
}

export function AdvisorChat({ variant = "behavioral" }: AdvisorChatProps) {
  const config = PROMPTS[variant];
  const [messages, setMessages] = useState<Message[]>([config.welcome]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset messages when variant changes
  useEffect(() => {
    setMessages([PROMPTS[variant].welcome]);
    setInput("");
  }, [variant]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const apiMessages = [config.system, ...updatedMessages];

      const response = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          model: "gpt-4o-mini",
          max_tokens: 3500,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantContent = data.choices[0].message.content;

      const assistantMessage: Message = {
        role: "assistant",
        content: assistantContent,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        role: "assistant",
        content:
          "申し訳ございません。応答の取得中にエラーが発生しました。しばらくしてから再度お試しください。",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, config.system]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const visibleMessages = messages.filter((m) => m.role !== "system");

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
        role="log"
        aria-label="チャットメッセージ"
        aria-live="polite"
      >
        {visibleMessages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${
              message.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            {/* Avatar */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === "user"
                  ? "bg-[#2d8a80]/20"
                  : "bg-white/[0.08]"
              }`}
              aria-hidden="true"
            >
              {message.role === "user" ? (
                <User className="w-4 h-4 text-[#2d8a80]" />
              ) : (
                <Bot className="w-4 h-4 text-white/70" />
              )}
            </div>

            {/* Message Bubble */}
            <div
              className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                message.role === "user"
                  ? "bg-[#2d8a80]/20 border border-[#2d8a80]/30 text-white/90"
                  : "bg-white/[0.05] border border-white/[0.08] text-white/80"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.08]"
              aria-hidden="true"
            >
              <Bot className="w-4 h-4 text-white/70" />
            </div>
            <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-3">
              <div
                className="flex items-center gap-1"
                role="status"
                aria-label="応答を生成中"
              >
                <Loader2 className="w-4 h-4 text-[#2d8a80] animate-spin" />
                <span className="text-sm text-white/50 ml-2">考え中</span>
                <span className="inline-flex gap-0.5">
                  <span
                    className="w-1 h-1 rounded-full bg-white/40 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1 h-1 rounded-full bg-white/40 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1 h-1 rounded-full bg-white/40 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-white/[0.08] p-4">
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder={config.placeholder}
            rows={1}
            disabled={isLoading}
            aria-label="メッセージ入力"
            className="flex-1 resize-none rounded-xl bg-white/[0.05] border border-white/[0.1] px-4 py-3 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-[#2d8a80] focus:ring-1 focus:ring-[#2d8a80]/30 transition-colors disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            aria-label="メッセージを送信"
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#2d8a80] hover:bg-[#3aada1] text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#2d8a80]"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-white/25 text-center mt-2">
          Shift + Enter で改行 / Enter で送信
        </p>
      </div>
    </div>
  );
}
