-- ============================================================================
-- 0080: GIAの酒場 billing state and initial owner
--
-- Sakaba's ¥480 membership is independent from public.applicants.plan.
-- The guild owner/master receives paid features without a Sakaba subscription.
-- Existing Stripe subscriptions on applicants are intentionally untouched.
-- ============================================================================

alter table sakaba.guild_members
  add column billing_status text not null default 'free',
  add column stripe_customer_id text,
  add column stripe_subscription_id text,
  add column stripe_price_id text,
  add column billing_updated_at timestamptz;

alter table sakaba.guild_members
  add constraint guild_members_billing_status_check
  check (billing_status in ('free', 'trialing', 'active', 'past_due', 'canceled', 'exempt'));

create unique index guild_members_stripe_subscription_uidx
  on sakaba.guild_members (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index guild_members_billing_status_idx
  on sakaba.guild_members (guild_id, billing_status);

comment on column sakaba.guild_members.billing_status is
  '酒場専用課金状態。owner/master は exempt でStripe契約不要。';
comment on column sakaba.guild_members.stripe_subscription_id is
  '酒場 月480円サブスクリプション専用。public.applicants の既存契約とは分離する。';

-- Paid access is based only on Sakaba billing or a guild management role.
-- Do not use public.applicants.plan: that column represents other GIA products.
create or replace function sakaba.is_paid_member(p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, sakaba
as $$
  select p_user_id is not null and exists (
    select 1
    from sakaba.guild_members gm
    where gm.user_id = p_user_id
      and gm.suspended_at is null
      and (
        gm.role in ('owner', 'master')
        or gm.billing_status in ('trialing', 'active', 'exempt')
      )
  );
$$;

revoke all on function sakaba.is_paid_member(uuid) from public;
grant execute on function sakaba.is_paid_member(uuid) to authenticated;

-- Bootstrap the existing GIA administrator as the owner of GIA's guild.
-- This grants Sakaba features with billing_status=exempt and does not create,
-- update or cancel any Stripe customer/subscription.
do $$
declare
  v_user_id uuid;
  v_display_name text;
  v_role_title text;
begin
  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = 'global.information.academy@gmail.com'
  limit 1;

  if v_user_id is null then
    raise exception 'GIA administrator auth user not found';
  end if;

  select coalesce(nullif(btrim(a.name), ''), '五島 一将'), coalesce(a.role_title, '')
  into v_display_name, v_role_title
  from public.applicants a
  where a.id = v_user_id;

  v_display_name := coalesce(v_display_name, '五島 一将');

  insert into sakaba.profiles (user_id, display_name)
  values (v_user_id, v_display_name)
  on conflict (user_id) do update
    set display_name = excluded.display_name;

  -- If an owner was provisioned manually before this migration, retain the row
  -- but make this designated account the owner and other owners masters.
  update sakaba.guild_members
  set role = 'master',
      billing_status = 'exempt',
      billing_updated_at = now()
  where guild_id = '00000000-0000-4000-8000-000000000001'
    and role = 'owner'
    and user_id <> v_user_id;

  insert into sakaba.guild_members (
    guild_id,
    user_id,
    role,
    company_name,
    position,
    show_company,
    invite_id,
    promises_agreed_at,
    billing_status,
    billing_updated_at
  ) values (
    '00000000-0000-4000-8000-000000000001',
    v_user_id,
    'owner',
    'GIA',
    case when v_role_title like '%代表%' then 'ceo' else 'other' end,
    true,
    null,
    now(),
    'exempt',
    now()
  )
  on conflict (guild_id, user_id) do update
    set role = 'owner',
        billing_status = 'exempt',
        billing_updated_at = now(),
        suspended_at = null;
end;
$$;

notify pgrst, 'reload schema';
