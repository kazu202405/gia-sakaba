// 紹介獲得セミナー（GIA）の mock データ。
//
// ⚠️ Phase 1 mock — 段階的に Supabase 化中、新規参照禁止。
//   - /join, /join/complete は Run 2（2026-04-27）で seminars テーブル参照に切替済み
//   - 現時点で本ファイルへの実 import は無いが、lib/invitations.ts などのコメント／設計上の
//     参照点として残置している。完全削除は次回クリーンアップ時に判断
//   - 新たに参照を追加せず、各画面ごとに Supabase 化していくこと

export interface SeminarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD 形式
  time: string; // 表示用の時間帯 (例: "20:00 - 21:30")
  location: string; // "オンライン" または会場名
  description: string;
  capacity?: number;
  applicantCount?: number;
  /** 参加者用 LINE グループ招待 URL（mock のプレースホルダー） */
  lineGroupUrl?: string;
}

/**
 * 開催予定のセミナー一覧。日付昇順で並べる前提。
 * 完了画面では先頭要素を「次回イベント」として表示する。
 */
export const upcomingSeminars: SeminarEvent[] = [
  {
    id: "gia-referral-vol-3",
    title: "紹介獲得セミナー 第3回",
    date: "2026-05-22",
    time: "20:00 - 21:30",
    location: "オンライン (Zoom)",
    description:
      "紹介が自然に生まれる関係性のつくり方を、実際のアプリを触りながら体験するセミナーです。",
    capacity: 30,
    applicantCount: 12,
    lineGroupUrl: "https://line.me/ti/g/example-vol3",
  },
  {
    id: "gia-referral-vol-4",
    title: "紹介獲得セミナー 第4回",
    date: "2026-06-19",
    time: "20:00 - 21:30",
    location: "オンライン (Zoom)",
    description:
      "「誰を、誰につなぐか」を仕組みにする回。第3回参加者の事例も共有します。",
    capacity: 30,
    applicantCount: 4,
    lineGroupUrl: "https://line.me/ti/g/example-vol4",
  },
  {
    id: "gia-referral-vol-5",
    title: "紹介獲得セミナー 第5回",
    date: "2026-07-17",
    time: "20:00 - 21:30",
    location: "オンライン (Zoom)",
    description:
      "リファラル文化を社内・コミュニティ内に根づかせるための実践編です。",
    capacity: 30,
    applicantCount: 1,
    lineGroupUrl: "https://line.me/ti/g/example-vol5",
  },
];

/**
 * セミナー日付を日本語の見やすい形式に整形する。
 * 例: "2026-05-22" → "2026年5月22日 (金)"
 */
export function formatSeminarDate(date: string): string {
  const d = new Date(date);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const wd = weekdays[d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 (${wd})`;
}
