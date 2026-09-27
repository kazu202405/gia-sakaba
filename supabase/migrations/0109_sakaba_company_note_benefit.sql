-- Company Note's current ¥11,000 "invite" subscription (and the legacy
-- "terakoya" subscription) grants Sakaba's ¥880 features without creating a
-- second Stripe subscription. The source of truth stays in public.applicants.
-- Do not copy its Stripe IDs into sakaba.guild_members or change Sakaba billing.

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
      and a.plan in ('invite', 'terakoya')
      and a.subscription_status in ('active', 'trialing')
      and a.stripe_subscription_id is not null
  );
$$;

revoke all on function sakaba.has_company_note_11000_benefit(uuid) from public;
revoke all on function sakaba.has_company_note_11000_benefit(uuid) from anon;
revoke all on function sakaba.has_company_note_11000_benefit(uuid) from authenticated;

create or replace function sakaba.is_paid_member(p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public, sakaba
as $$
  select p_user_id is not null and exists (
    select 1
    from sakaba.guild_members gm
    where gm.user_id = p_user_id
      and gm.suspended_at is null
      and (
        gm.role in ('owner', 'master')
        or gm.billing_status in ('trialing', 'active', 'exempt')
        or sakaba.has_company_note_11000_benefit(p_user_id)
      )
  );
$$;

revoke all on function sakaba.is_paid_member(uuid) from public;
grant execute on function sakaba.is_paid_member(uuid) to authenticated;

create or replace function public.sakaba_get_my_billing(p_guild_slug text default 'gia')
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, public, sakaba
as $$
declare
  v_user_id uuid := auth.uid();
  v_member sakaba.guild_members%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select gm.* into v_member
  from sakaba.guild_members gm
  join sakaba.guilds g on g.id = gm.guild_id
  where lower(g.slug) = lower(btrim(p_guild_slug))
    and gm.user_id = v_user_id
    and gm.suspended_at is null;

  if not found then
    raise exception 'guild membership required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'guild_id', v_member.guild_id,
    'user_id', v_member.user_id,
    'role', v_member.role,
    'billing_status', v_member.billing_status,
    'stripe_customer_id', v_member.stripe_customer_id,
    'stripe_subscription_id', v_member.stripe_subscription_id,
    'stripe_price_id', v_member.stripe_price_id,
    'is_paid', sakaba.is_paid_member(v_user_id),
    'company_note_benefit', sakaba.has_company_note_11000_benefit(v_user_id)
  );
end;
$$;

revoke all on function public.sakaba_get_my_billing(text) from public;
grant execute on function public.sakaba_get_my_billing(text) to authenticated;

notify pgrst, 'reload schema';
