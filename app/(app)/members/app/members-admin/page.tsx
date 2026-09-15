"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  CalendarDays,
  MapPin,
  X,
} from "lucide-react";

// --- Mock: メンバー一覧（簡易） ---
const allMembers = [
  { id: "1", name: "田中 一郎", short: "田中", photoUrl: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face" },
  { id: "2", name: "佐藤 裕樹", short: "佐藤", photoUrl: "https://images.unsplash.com/photo-1619193597120-1d1edb42e34b?w=400&h=400&fit=crop&crop=face" },
  { id: "3", name: "山本 恵美", short: "山本", photoUrl: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face" },
  { id: "4", name: "鈴木 健二", short: "鈴木", photoUrl: "https://images.unsplash.com/photo-1720467438431-c1b5659a933e?w=400&h=400&fit=crop&crop=face" },
  { id: "5", name: "中村 明子", short: "中村", photoUrl: "https://images.unsplash.com/photo-1624091844772-554661d10173?w=400&h=400&fit=crop&crop=face" },
  { id: "6", name: "渡辺 剛", short: "渡辺", photoUrl: "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face" },
  { id: "7", name: "小川 理沙", short: "小川", photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face" },
  { id: "8", name: "森田 駿", short: "森田", photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face" },
  { id: "9", name: "藤田 舞", short: "藤田", photoUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face" },
  { id: "10", name: "本田 浩二", short: "本田", photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face" },
];

// --- Mock: 会った記録（ペア別） ---
interface Meeting {
  date: string;
  occasion: string;
  location: string;
}

interface MeetingPair {
  memberA: string; // id
  memberB: string; // id
  meetings: Meeting[];
}

const meetingPairs: MeetingPair[] = [
  {
    memberA: "1", memberB: "10",
    meetings: [
      { date: "2026-03-01", occasion: "第12回 経営者グルメ会", location: "鮨 まつもと（大阪・北新地）" },
      { date: "2025-11-15", occasion: "第9回 経営者グルメ会", location: "天ぷら 大阪あら川（大阪・本町）" },
      { date: "2025-08-20", occasion: "個別会食", location: "割烹 田中（大阪・北新地）" },
    ],
  },
  {
    memberA: "1", memberB: "2",
    meetings: [
      { date: "2026-02-01", occasion: "第11回 経営者グルメ会", location: "割烹 田中（大阪・北新地）" },
      { date: "2025-10-10", occasion: "個別ランチ", location: "珈琲 蘭館（福岡・大名）" },
    ],
  },
  {
    memberA: "1", memberB: "5",
    meetings: [
      { date: "2026-02-01", occasion: "第11回 経営者グルメ会", location: "割烹 田中（大阪・北新地）" },
      { date: "2025-12-05", occasion: "健康経営セミナー", location: "ホテルニューオータニ（大阪）" },
    ],
  },
  {
    memberA: "1", memberB: "8",
    meetings: [
      { date: "2026-01-20", occasion: "ワイン勉強会", location: "ワインバー CAVA（大阪・心斎橋）" },
      { date: "2025-09-12", occasion: "個別会食", location: "炭火焼鳥 やまもと（大阪・福島）" },
      { date: "2025-06-30", occasion: "第7回 経営者グルメ会", location: "リストランテ ルーチェ（大阪・西天満）" },
      { date: "2025-03-15", occasion: "紹介ランチ", location: "鮨 まつもと（大阪・北新地）" },
    ],
  },
  {
    memberA: "1", memberB: "4",
    meetings: [
      { date: "2026-01-10", occasion: "個別会食", location: "焼肉 万両（大阪・南森町）" },
    ],
  },
  {
    memberA: "1", memberB: "7",
    meetings: [
      { date: "2026-02-15", occasion: "新メンバー歓迎ランチ", location: "ビストロ マルシェ（大阪・中之島）" },
    ],
  },
  {
    memberA: "1", memberB: "3",
    meetings: [
      { date: "2026-03-01", occasion: "第12回 経営者グルメ会", location: "鮨 まつもと（大阪・北新地）" },
      { date: "2025-11-15", occasion: "第9回 経営者グルメ会", location: "天ぷら 大阪あら川（大阪・本町）" },
      { date: "2025-08-20", occasion: "個別会食", location: "割烹 田中（大阪・北新地）" },
      { date: "2025-05-10", occasion: "第6回 経営者グルメ会", location: "蕎麦 よしむら（京都・祇園）" },
      { date: "2025-02-14", occasion: "紹介ディナー", location: "割烹 田中（大阪・北新地）" },
    ],
  },
  {
    memberA: "1", memberB: "6",
    meetings: [
      { date: "2026-01-20", occasion: "ワイン勉強会", location: "ワインバー CAVA（大阪・心斎橋）" },
      { date: "2025-07-05", occasion: "資産運用相談", location: "リーガロイヤルホテル（大阪・中之島）" },
    ],
  },
  {
    memberA: "2", memberB: "7",
    meetings: [
      { date: "2026-02-15", occasion: "新メンバー歓迎ランチ", location: "ビストロ マルシェ（大阪・中之島）" },
    ],
  },
  {
    memberA: "2", memberB: "3",
    meetings: [
      { date: "2026-02-01", occasion: "第11回 経営者グルメ会", location: "割烹 田中（大阪・北新地）" },
    ],
  },
  {
    memberA: "3", memberB: "10",
    meetings: [
      { date: "2026-03-01", occasion: "第12回 経営者グルメ会", location: "鮨 まつもと（大阪・北新地）" },
      { date: "2025-11-15", occasion: "第9回 経営者グルメ会", location: "天ぷら 大阪あら川（大阪・本町）" },
    ],
  },
  {
    memberA: "3", memberB: "9",
    meetings: [
      { date: "2025-12-20", occasion: "産地訪問", location: "農家レストラン みのり（長野・安曇野）" },
    ],
  },
  {
    memberA: "4", memberB: "6",
    meetings: [
      { date: "2025-10-25", occasion: "個別会食", location: "焼肉 万両（大阪・南森町）" },
      { date: "2025-07-05", occasion: "資産運用相談", location: "リーガロイヤルホテル（大阪・中之島）" },
    ],
  },
  {
    memberA: "5", memberB: "9",
    meetings: [
      { date: "2025-11-30", occasion: "ヘルスケアイベント", location: "自然食レストラン みどり（大阪・中崎町）" },
    ],
  },
  {
    memberA: "6", memberB: "8",
    meetings: [
      { date: "2026-01-20", occasion: "ワイン勉強会", location: "ワインバー CAVA（大阪・心斎橋）" },
    ],
  },
  {
    memberA: "8", memberB: "10",
    meetings: [
      { date: "2025-12-10", occasion: "飲食業界交流会", location: "日本料理 かが万（大阪・北浜）" },
    ],
  },
  {
    memberA: "1", memberB: "9",
    meetings: [
      { date: "2025-12-20", occasion: "産地訪問", location: "農家レストラン みのり（長野・安曇野）" },
    ],
  },
];

// ペアのキーを正規化（小さいID, 大きいID）
function pairKey(a: string, b: string) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

// ペアの会った回数マップを構築
function buildMeetingCountMap() {
  const map = new Map<string, number>();
  for (const pair of meetingPairs) {
    const key = pairKey(pair.memberA, pair.memberB);
    map.set(key, pair.meetings.length);
  }
  return map;
}

// ペアのミーティング詳細を取得
function getMeetingsForPair(a: string, b: string): Meeting[] {
  const key = pairKey(a, b);
  const pair = meetingPairs.find(
    (p) => pairKey(p.memberA, p.memberB) === key
  );
  return pair?.meetings || [];
}

function heatColor(count: number): string {
  if (count === 0) return "bg-gray-50 text-gray-300";
  if (count === 1) return "bg-amber-50 text-amber-700";
  if (count === 2) return "bg-amber-100 text-amber-800";
  if (count <= 3) return "bg-amber-200 text-amber-900";
  return "bg-amber-300 text-amber-900 font-bold";
}

export default function MembersAdminPage() {
  const [selectedPair, setSelectedPair] = useState<{
    a: (typeof allMembers)[number];
    b: (typeof allMembers)[number];
    meetings: Meeting[];
  } | null>(null);

  const countMap = buildMeetingCountMap();

  const handleCellClick = (a: (typeof allMembers)[number], b: (typeof allMembers)[number]) => {
    const meetings = getMeetingsForPair(a.id, b.id);
    if (meetings.length > 0) {
      setSelectedPair({ a, b, meetings });
    }
  };

  // 各メンバーの合計会った回数
  const totalMeetings = allMembers.map((m) => {
    let total = 0;
    for (const other of allMembers) {
      if (m.id === other.id) continue;
      total += countMap.get(pairKey(m.id, other.id)) || 0;
    }
    return { member: m, total };
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-400" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">ユーザー管理</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                メンバー同士の会った回数と履歴
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{allMembers.length}</p>
            <p className="text-xs text-gray-500 mt-1">メンバー数</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {meetingPairs.reduce((sum, p) => sum + p.meetings.length, 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">総会合数</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{meetingPairs.length}</p>
            <p className="text-xs text-gray-500 mt-1">つながりペア</p>
          </div>
        </div>

        {/* Matrix */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8 overflow-x-auto">
          <h2 className="text-base font-bold text-gray-900 mb-4">交流マトリクス</h2>
          <p className="text-xs text-gray-400 mb-4">セルをクリックすると詳細を表示します</p>
          <table className="w-full border-collapse min-w-[600px]">
            <thead>
              <tr>
                <th className="p-1.5 text-[10px] text-gray-400 font-medium w-16" />
                {allMembers.map((m) => (
                  <th key={m.id} className="p-1 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <img
                        src={m.photoUrl}
                        alt={m.short}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <span className="text-[10px] text-gray-500 font-medium leading-tight">
                        {m.short}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allMembers.map((row) => (
                <tr key={row.id}>
                  <td className="p-1.5">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={row.photoUrl}
                        alt={row.short}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <span className="text-[10px] text-gray-600 font-medium whitespace-nowrap">
                        {row.short}
                      </span>
                    </div>
                  </td>
                  {allMembers.map((col) => {
                    if (row.id === col.id) {
                      return (
                        <td key={col.id} className="p-1">
                          <div className="w-full aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                            <span className="text-[10px] text-gray-300">-</span>
                          </div>
                        </td>
                      );
                    }
                    const count = countMap.get(pairKey(row.id, col.id)) || 0;
                    return (
                      <td key={col.id} className="p-1">
                        <button
                          onClick={() => count > 0 && handleCellClick(row, col)}
                          className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all ${heatColor(count)} ${
                            count > 0
                              ? "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:shadow-sm"
                              : "cursor-default"
                          }`}
                        >
                          {count || ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
            <span className="text-[10px] text-gray-400">回数:</span>
            {[0, 1, 2, 3, 4].map((n) => (
              <div key={n} className="flex items-center gap-1">
                <div className={`w-5 h-5 rounded ${heatColor(n)} flex items-center justify-center text-[10px]`}>
                  {n || ""}
                </div>
                <span className="text-[10px] text-gray-400">
                  {n === 0 ? "未" : n === 4 ? "4+" : `${n}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Member ranking */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">交流回数ランキング</h2>
          <div className="space-y-3">
            {totalMeetings
              .sort((a, b) => b.total - a.total)
              .map((item, i) => (
                <div key={item.member.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? "bg-amber-100 text-amber-700" :
                    i === 1 ? "bg-gray-100 text-gray-600" :
                    i === 2 ? "bg-orange-50 text-orange-600" :
                    "bg-gray-50 text-gray-400"
                  }`}>
                    {i + 1}
                  </span>
                  <Link href={`/members/app/profile/${item.member.id}`} className="flex items-center gap-2.5 flex-1 group">
                    <img
                      src={item.member.photoUrl}
                      alt={item.member.name}
                      className="w-9 h-9 rounded-full object-cover border-2 border-white shadow ring-1 ring-gray-100"
                    />
                    <span className="text-sm font-medium text-gray-900 group-hover:text-amber-700 transition-colors">
                      {item.member.name}
                    </span>
                  </Link>
                  <div className="flex items-center gap-1.5">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${Math.min((item.total / (totalMeetings[0]?.total || 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-8 text-right">
                      {item.total}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {selectedPair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedPair(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setSelectedPair(null)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>

            {/* Pair header */}
            <div className="flex items-center gap-3 mb-6">
              <img
                src={selectedPair.a.photoUrl}
                alt={selectedPair.a.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
              />
              <span className="text-lg font-bold text-gray-300">&times;</span>
              <img
                src={selectedPair.b.photoUrl}
                alt={selectedPair.b.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
              />
              <div className="ml-1">
                <p className="text-sm font-bold text-gray-900">
                  {selectedPair.a.short} &times; {selectedPair.b.short}
                </p>
                <p className="text-xs text-gray-500">
                  計 {selectedPair.meetings.length} 回
                </p>
              </div>
            </div>

            {/* Meeting timeline */}
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-amber-200" />
              {selectedPair.meetings.map((meeting, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-white border-2 border-amber-400 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm font-bold text-gray-900 mb-1.5">
                      {meeting.occasion}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>{meeting.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{meeting.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
