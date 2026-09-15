-- 0053_ai_clone_service_referral_fields.sql
--
-- サービス・商品を「紹介されやすく」磨くための3項目を追加。
-- 既存のサービス記録は 対象/悩み/提供/料金/向き不向き はあるが、
-- 紹介が起こる肝＝USP・あなたから買う理由・紹介しやすい一言 が無かった。
-- 紹介コーチのワークシート（価値設計 WS02 / 見せ方 WS01）の項目に対応させ、
-- /clone/<slug>/services の編集画面で「AIで磨く」→ ここに保存できるようにする。
--
-- いずれも任意のテキスト。マイグレ後の既存行は null（=未記入）。

alter table ai_clone_service
  add column if not exists usp text,                 -- 他との違い（USP）
  add column if not exists buying_reason text,        -- あなたから買う理由（なぜあなた/なぜ今）
  add column if not exists referral_one_liner text;   -- 紹介しやすい一言（30秒スクリプト）
