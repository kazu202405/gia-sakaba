"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Handshake,
  MapPin,
  CalendarDays,
  MessageSquare,
  Plus,
  Settings,
  X,
  RotateCcw,
  Tag,
} from "lucide-react";

const STORAGE_KEY = "gia-connection-tags";
const DEFAULT_TAGS = ["コラボ可能性", "商談中", "紹介予定"];

interface Connection {
  id: string;
  person: { id: string; name: string; photoUrl: string; roleTitle: string };
  occasion: string;
  date: string;
  location: string;
  note: string;
  tags: string[];
}

const mockConnections: Connection[] = [
  {
    id: "c1",
    person: { id: "10", name: "本田 浩二", photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face", roleTitle: "飲食店グループ経営" },
    occasion: "第12回 経営者グルメ会",
    date: "2026-03-01",
    location: "鮨 まつもと（大阪・北新地）",
    note: "飲食業界の裏側について深い話ができた。新メニュー開発の相談を受けそう。",
    tags: ["飲食", "コラボ可能性"],
  },
  {
    id: "c2",
    person: { id: "7", name: "小川 理沙", photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face", roleTitle: "デザイナー" },
    occasion: "新メンバー歓迎ランチ",
    date: "2026-02-15",
    location: "ビストロ マルシェ（大阪・中之島）",
    note: "空間デザインの視点が面白い。オフィスリニューアルの際に相談したい。",
    tags: ["デザイン", "紹介候補"],
  },
  {
    id: "c3",
    person: { id: "2", name: "佐藤 裕樹", photoUrl: "https://images.unsplash.com/photo-1619193597120-1d1edb42e34b?w=400&h=400&fit=crop&crop=face", roleTitle: "IT起業家" },
    occasion: "第11回 経営者グルメ会",
    date: "2026-02-01",
    location: "割烹 田中（大阪・北新地）",
    note: "地方DXの取り組みに共感。クライアント企業を紹介できるかも。",
    tags: ["IT", "紹介予定"],
  },
  {
    id: "c4",
    person: { id: "5", name: "中村 明子", photoUrl: "https://images.unsplash.com/photo-1624091844772-554661d10173?w=400&h=400&fit=crop&crop=face", roleTitle: "医師・クリニック経営" },
    occasion: "第11回 経営者グルメ会",
    date: "2026-02-01",
    location: "割烹 田中（大阪・北新地）",
    note: "健康経営のセミナーを共同開催する方向で話が進んだ。来月詳細を詰める。",
    tags: ["医療", "コラボ進行中"],
  },
  {
    id: "c5",
    person: { id: "8", name: "森田 駿", photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face", roleTitle: "人材紹介業" },
    occasion: "ワイン勉強会",
    date: "2026-01-20",
    location: "ワインバー CAVA（大阪・心斎橋）",
    note: "経営幹部の採用で連携できそう。ワインの趣味も合って話が弾んだ。",
    tags: ["人材", "紹介候補"],
  },
  {
    id: "c6",
    person: { id: "4", name: "鈴木 健二", photoUrl: "https://images.unsplash.com/photo-1720467438431-c1b5659a933e?w=400&h=400&fit=crop&crop=face", roleTitle: "不動産デベロッパー" },
    occasion: "個別会食",
    date: "2026-01-10",
    location: "焼肉 万両（大阪・南森町）",
    note: "オフィス移転の相談。物件をいくつか紹介してもらえることに。",
    tags: ["不動産", "商談中"],
  },
];

function loadTags(): string[] {
  if (typeof window === "undefined") return DEFAULT_TAGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_TAGS;
}

function saveTags(tags: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
  } catch {}
}

function ConnectionCard({ connection }: { connection: Connection }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6">
      {/* Person */}
      <div className="flex items-center gap-3 mb-4">
        <Link href={`/members/app/profile/${connection.person.id}`}>
          <img
            src={connection.person.photoUrl}
            alt={connection.person.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow ring-1 ring-gray-100 hover:ring-amber-300 transition-all"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/members/app/profile/${connection.person.id}`}
            className="text-base font-bold text-gray-900 hover:text-amber-700 transition-colors"
          >
            {connection.person.name}
          </Link>
          <p className="text-sm text-gray-500">{connection.person.roleTitle}</p>
        </div>
      </div>

      {/* Meta */}
      <div className="space-y-1.5 mb-4 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <Handshake className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span>{connection.occasion}</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span>{connection.date}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span>{connection.location}</span>
        </div>
      </div>

      {/* Note */}
      <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl mb-4">
        <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-gray-600 leading-relaxed">
          {connection.note}
        </p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {connection.tags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
              tag.includes("進行中") || tag.includes("商談中")
                ? "bg-green-50 text-green-700 border-green-200"
                : tag.includes("予定")
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ConnectionsPage() {
  const [activeTag, setActiveTag] = useState("すべて");
  const [showForm, setShowForm] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [customTags, setCustomTags] = useState<string[]>(DEFAULT_TAGS);
  const [newTagInput, setNewTagInput] = useState("");

  // localStorageからタグを読み込み（クライアントサイドのみ）
  useEffect(() => {
    setCustomTags(loadTags());
  }, []);

  const updateTags = useCallback((tags: string[]) => {
    setCustomTags(tags);
    saveTags(tags);
  }, []);

  const addTag = useCallback(() => {
    const trimmed = newTagInput.trim();
    if (!trimmed || customTags.includes(trimmed)) return;
    updateTags([...customTags, trimmed]);
    setNewTagInput("");
  }, [newTagInput, customTags, updateTags]);

  const removeTag = useCallback((tag: string) => {
    const updated = customTags.filter((t) => t !== tag);
    updateTags(updated);
    // 削除されたタグがアクティブなら「すべて」に戻す
    if (activeTag === tag) setActiveTag("すべて");
  }, [customTags, activeTag, updateTags]);

  const resetToDefault = useCallback(() => {
    updateTags(DEFAULT_TAGS);
    if (!DEFAULT_TAGS.includes(activeTag) && activeTag !== "すべて") {
      setActiveTag("すべて");
    }
  }, [activeTag, updateTags]);

  const allTags = ["すべて", ...customTags];

  const filtered =
    activeTag === "すべて"
      ? mockConnections
      : mockConnections.filter((c) => c.tags.includes(activeTag));

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">出会い管理</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                誰とどこで出会い、どんな話をしたか
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              記録する
            </button>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 mt-4">
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide flex-1">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTag === tag
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTagManager(!showTagManager)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                showTagManager
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              タグ管理
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* タグ管理パネル */}
        {showTagManager && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 mb-8">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-gray-500" />
                <h2 className="text-base font-bold text-gray-900">タグ管理</h2>
              </div>
              <button
                onClick={() => setShowTagManager(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* タグ一覧 */}
            <div className="flex flex-wrap gap-2 mb-5">
              {customTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="p-0.5 rounded-full hover:bg-gray-300 transition-colors"
                    title={`「${tag}」を削除`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {customTags.length === 0 && (
                <p className="text-sm text-gray-400">タグがありません</p>
              )}
            </div>

            {/* 新規タグ追加 */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="新しいタグ名..."
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <button
                onClick={addTag}
                disabled={!newTagInput.trim() || customTags.includes(newTagInput.trim())}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                追加
              </button>
            </div>

            {/* デフォルトに戻す */}
            <button
              onClick={resetToDefault}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              デフォルトに戻す
            </button>
          </div>
        )}

        {/* Quick form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 sm:p-8 mb-8">
            <h2 className="text-base font-bold text-gray-900 mb-5">
              出会いを記録する
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    お相手
                  </label>
                  <input
                    type="text"
                    placeholder="名前で検索..."
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    きっかけ
                  </label>
                  <input
                    type="text"
                    placeholder="例: 第12回 経営者グルメ会"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    日付
                  </label>
                  <input
                    type="date"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    場所
                  </label>
                  <input
                    type="text"
                    placeholder="例: 鮨 まつもと（大阪・北新地）"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  メモ
                </label>
                <textarea
                  rows={3}
                  placeholder="話した内容、次のアクション、印象など..."
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
                >
                  記録する
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {mockConnections.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">出会い</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {new Set(mockConnections.map((c) => c.person.id)).size}
            </p>
            <p className="text-xs text-gray-500 mt-1">人</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {mockConnections.filter((c) => c.tags.some((t) => t.includes("進行中") || t.includes("商談中"))).length}
            </p>
            <p className="text-xs text-gray-500 mt-1">進行中</p>
          </div>
        </div>

        {/* Connection list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((conn) => (
            <ConnectionCard key={conn.id} connection={conn} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Handshake className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">該当する記録がありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
