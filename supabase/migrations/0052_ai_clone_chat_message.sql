-- 0052_ai_clone_chat_message.sql
--
-- 右腕AI（generateReply）のチャンネル横断 会話履歴。
-- Slack / LINE / Web からの 1メッセージごとに「今までまっさら」で応答していたため、
-- 「さっきの○○さんの件」「あるよ」のような前後の文脈を保てず、
-- 履歴に無い人物名を捏造する不具合があった（例：山崎さんの話の最中に「田中さん」と誤答）。
--
-- このテーブルに user/assistant の発話を時系列で残し、generateReply 冒頭で直近 N 件を
-- 読み込んで応答コンテキストに積む。スレッド分割はせず (tenant, channel, external_user_id)
-- ごとに 1 本の連続した会話として扱う（右腕は1人・関係は1本の思想に合わせる）。
--
-- 紹介コーチ用の ai_clone_coach_message（0050）とは別。あちらはコーチページ専用、
-- こちらは右腕AI 本体（generateReply）のチャンネル横断記憶。

create table if not exists ai_clone_chat_message (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  channel text not null check (channel in ('Slack', 'LINE', 'Web')),
  external_user_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
-- 直近 N 件の取得（tenant×channel×user で時系列降順）に効くインデックス
create index on ai_clone_chat_message(tenant_id, channel, external_user_id, created_at);

alter table ai_clone_chat_message enable row level security;
create policy ai_clone_chat_message_select on ai_clone_chat_message for select
  using (ai_clone_is_tenant_member(tenant_id));
create policy ai_clone_chat_message_modify on ai_clone_chat_message for all
  using (ai_clone_is_tenant_member(tenant_id))
  with check (ai_clone_is_tenant_member(tenant_id));
