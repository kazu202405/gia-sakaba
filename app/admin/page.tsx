"use client";

// 会員管理ハブ。
// /admin にアクセスするとここに来る。Editorial 格式のヘッダー +
// タブで5つのサブビューを切り替える：
//   1. 入会申請（AdmissionsTab）— 楽観的更新で承認/却下、notes 編集、CSV
//   2. 全会員一覧（MembersTab）— applicants 起点、tier 別、CSV
//   3. ダッシュボード（DashboardTab）— 月次推移・セミナー別・紹介者 Top 5
//   4. 招待コード（InvitesTab）— invite_code 利用集計（Phase 2 で表名拡張）
//   5. アクティビティログ（ActivityTab）— 申込/承認/却下/キャンセルの履歴
//
// 認証ガードは middleware.ts 側。このページ自身は session を見ない。

import { useState } from "react";
import {
  ClipboardList,
  Users,
  BarChart3,
  Send,
  History,
  ClipboardCheck,
} from "lucide-react";
import {
  EditorialHeader,
  MetricChip,
} from "./_components/EditorialChrome";
import { AdmissionsTab } from "./_components/AdmissionsTab";
import { MembersTab } from "./_components/MembersTab";
import { DashboardTab } from "./_components/DashboardTab";
import { InvitesTab } from "./_components/InvitesTab";
import { ActivityTab } from "./_components/ActivityTab";
import { SurveysTab } from "./_components/SurveysTab";

type TabKey =
  | "admissions"
  | "members"
  | "dashboard"
  | "invites"
  | "activity"
  | "surveys";

const tabs: {
  key: TabKey;
  label: string;
  Icon: typeof ClipboardList;
  description: string;
}[] = [
  {
    key: "admissions",
    label: "入会申請",
    Icon: ClipboardList,
    description: "承認・却下の管理",
  },
  {
    key: "members",
    label: "全会員",
    Icon: Users,
    description: "登録済み全会員の一覧と tier",
  },
  {
    key: "dashboard",
    label: "ダッシュボード",
    Icon: BarChart3,
    description: "月次推移・セミナー別・紹介者集計",
  },
  {
    key: "invites",
    label: "招待コード",
    Icon: Send,
    description: "招待リンク発行と利用状況",
  },
  {
    key: "activity",
    label: "ログ",
    Icon: History,
    description: "申込・承認・却下の履歴",
  },
  {
    key: "surveys",
    label: "アンケート",
    Icon: ClipboardCheck,
    description: "売上導線診断の回答一覧",
  },
];

export default function AdminMembersHub() {
  const [active, setActive] = useState<TabKey>("admissions");
  const [pendingCount, setPendingCount] = useState(0);

  const current = tabs.find((t) => t.key === active)!;

  return (
    <div className="px-5 sm:px-8 py-6 sm:py-10 max-w-6xl mx-auto space-y-6">
      <EditorialHeader
        eyebrow="GIA / MEMBERS"
        title="会員管理"
        description={current.description}
        right={
          pendingCount > 0 ? (
            <MetricChip
              count={pendingCount}
              label="件 審査待ち"
              tone="gold"
            />
          ) : undefined
        }
      />

      {/* タブナビ */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {tabs.map((t) => {
          const Icon = t.Icon;
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "text-[#1c3550]"
                  : "text-gray-500 hover:text-[#1c3550]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
              {t.key === "admissions" && pendingCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[#c08a3e] text-white text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#c08a3e]"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* タブの中身 */}
      <div>
        {active === "admissions" && (
          <AdmissionsTab
            onCountsChange={(c) => setPendingCount(c.pending)}
          />
        )}
        {active === "members" && <MembersTab />}
        {active === "dashboard" && <DashboardTab />}
        {active === "invites" && <InvitesTab />}
        {active === "activity" && <ActivityTab />}
        {active === "surveys" && <SurveysTab />}
      </div>
    </div>
  );
}
