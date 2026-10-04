-- Company Note の有料会員は全員、酒場のビジネスプラン（月880円）の機能を使える（2026-10-04 五島さん）。
-- 0109 は「11,000円の招待プラン（invite）と旧テラこやで、Stripeの契約が有効な人」だけだった。
-- Company Note 側の有料会員の判定（stock/gia_identity.is_paid_member）と、GIA の isActiveMember
-- （lib/membership/plans.ts）は、もっと広い：
--   plan が会員の段（online / real / invite / premium）のどれか／旧テラこや（terakoya）／tier = 'paid'（旧サロン・旧本会員）
--   subscription_status と Stripe の契約は見ない（管理側で手動付与した会員を締め出さない。解約時は webhook が plan を外す）
-- そのため online の会員などが「Company Noteでは有料なのに酒場では無料プラン」になっていた。ここで同じ決まりにそろえる。
--
-- ⚠️ 会員の段を足したら、lib/membership/plans.ts の MEMBERSHIP_PLANS と、この関数と、stock/gia_identity.py の
--    MEMBERSHIP_PLANS を一緒に直す（lib/guild/company-note-benefit.test.ts が TS とこの関数のずれを見張る）。
-- ⚠️ 関数名は呼び出し元（0109 の is_paid_member / sakaba_get_my_billing、0114 のプラン判定）を変えないために、そのまま。
-- 2回流しても安全（create or replace だけ）。

create or replace function sakaba.has_company_note_11000_benefit(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public, sakaba
as $$
  select p_user_id is not null and exists (
    select 1
    from public.applicants a
    where a.id = p_user_id
      and (
        a.plan in ('online', 'real', 'invite', 'premium', 'terakoya')
        or a.tier = 'paid'
      )
  );
$$;

revoke all on function sakaba.has_company_note_11000_benefit(uuid) from public;
revoke all on function sakaba.has_company_note_11000_benefit(uuid) from anon;
revoke all on function sakaba.has_company_note_11000_benefit(uuid) from authenticated;

comment on function sakaba.has_company_note_11000_benefit(uuid) is
  'Company Noteの有料会員か（GIAの isActiveMember と同じ決まり）。名前は0109のまま。11,000円に限らない（0127）';

notify pgrst, 'reload schema';
