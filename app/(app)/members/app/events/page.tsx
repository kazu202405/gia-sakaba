"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Users,
  Clock,
  Plus,
  ChevronRight,
  Check,
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  participantCount: number;
  participants: { id: string; name: string; photoUrl: string }[];
  status: "upcoming" | "past";
  isHost: boolean;
}

const mockEvents: Event[] = [
  {
    id: "e1",
    title: "第12回 経営者グルメ会",
    date: "2026-03-01",
    time: "19:00〜22:00",
    location: "鮨 まつもと（大阪・北新地）",
    description:
      "今回は北新地の名店で、メンバー同士の交流を深めます。初参加の方も歓迎です。",
    participantCount: 8,
    participants: [
      { id: "1", name: "田中 一郎", photoUrl: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face" },
      { id: "3", name: "山本 恵美", photoUrl: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face" },
      { id: "6", name: "渡辺 剛", photoUrl: "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face" },
      { id: "10", name: "本田 浩二", photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face" },
    ],
    status: "upcoming",
    isHost: true,
  },
  {
    id: "e2",
    title: "新メンバー歓迎ランチ",
    date: "2026-03-08",
    time: "12:00〜14:00",
    location: "ビストロ マルシェ（大阪・中之島）",
    description:
      "今月入会した3名の歓迎ランチです。カジュアルな雰囲気でお互いを知る場にしましょう。",
    participantCount: 6,
    participants: [
      { id: "3", name: "山本 恵美", photoUrl: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face" },
      { id: "7", name: "小川 理沙", photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face" },
      { id: "9", name: "藤田 舞", photoUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face" },
    ],
    status: "upcoming",
    isHost: false,
  },
  {
    id: "e3",
    title: "第11回 経営者グルメ会",
    date: "2026-02-01",
    time: "19:00〜22:00",
    location: "割烹 田中（大阪・北新地）",
    description: "北新地の割烹で季節の食材を楽しみながら、事業の近況を共有しました。",
    participantCount: 10,
    participants: [
      { id: "1", name: "田中 一郎", photoUrl: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face" },
      { id: "2", name: "佐藤 裕樹", photoUrl: "https://images.unsplash.com/photo-1619193597120-1d1edb42e34b?w=400&h=400&fit=crop&crop=face" },
      { id: "4", name: "鈴木 健二", photoUrl: "https://images.unsplash.com/photo-1720467438431-c1b5659a933e?w=400&h=400&fit=crop&crop=face" },
      { id: "5", name: "中村 明子", photoUrl: "https://images.unsplash.com/photo-1624091844772-554661d10173?w=400&h=400&fit=crop&crop=face" },
    ],
    status: "past",
    isHost: true,
  },
  {
    id: "e4",
    title: "ワイン勉強会",
    date: "2026-01-20",
    time: "18:30〜21:00",
    location: "ワインバー CAVA（大阪・心斎橋）",
    description:
      "ソムリエを招いてのワイン勉強会。ビジネスシーンでのワイン選びを学びました。",
    participantCount: 5,
    participants: [
      { id: "6", name: "渡辺 剛", photoUrl: "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face" },
      { id: "8", name: "森田 駿", photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face" },
    ],
    status: "past",
    isHost: false,
  },
];

function EventCard({ event }: { event: Event }) {
  const isUpcoming = event.status === "upcoming";

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm p-6 transition-all hover:shadow-md ${
        isUpcoming ? "border-amber-200" : "border-gray-100"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          {isUpcoming && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold mb-2">
              開催予定
            </span>
          )}
          <h3 className="text-base font-bold text-gray-900">{event.title}</h3>
        </div>
        {event.isHost && (
          <span className="px-2 py-0.5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex-shrink-0">
            主催
          </span>
        )}
      </div>

      <div className="space-y-2 mb-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span>{event.date}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span>{event.time}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span>{event.location}</span>
        </div>
      </div>

      <p className="text-sm text-gray-500 leading-relaxed mb-4">
        {event.description}
      </p>

      {/* Participants */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {event.participants.slice(0, 4).map((p) => (
              <img
                key={p.id}
                src={p.photoUrl}
                alt={p.name}
                className="w-7 h-7 rounded-full object-cover border-2 border-white shadow"
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">
            {event.participantCount}人参加
          </span>
        </div>
        {isUpcoming && (
          <button className="text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1">
            詳細
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [showCreate, setShowCreate] = useState(false);

  const filtered = mockEvents.filter((e) => e.status === tab);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">会の管理</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                コミュニティのイベント・会食を管理
              </p>
            </div>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              会を作成
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 bg-gray-100 rounded-xl p-1 w-fit">
            <button
              onClick={() => setTab("upcoming")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === "upcoming"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              今後の予定
            </button>
            <button
              onClick={() => setTab("past")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === "past"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              過去の会
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create event form (toggle) */}
        {showCreate && (
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 sm:p-8 mb-8">
            <h2 className="text-base font-bold text-gray-900 mb-5">
              新しい会を作成
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  タイトル
                </label>
                <input
                  type="text"
                  placeholder="例: 第13回 経営者グルメ会"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
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
                    時間
                  </label>
                  <input
                    type="text"
                    placeholder="例: 19:00〜22:00"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  説明
                </label>
                <textarea
                  rows={3}
                  placeholder="会の趣旨や備考を記入..."
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
                >
                  作成する
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Event list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">
              {tab === "upcoming"
                ? "今後のイベントはありません"
                : "過去のイベントはありません"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
