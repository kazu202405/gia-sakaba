-- GIAの酒場専用 Stripe billing RPCs.
-- Existing public.applicants subscriptions remain completely separate.

create or replace function public.sakaba_get_my_billing(
  p_guild_slug text default 'gia'
)
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
    'is_paid', sakaba.is_paid_member(v_user_id)
  );
end;
$$;

-- Called only by the Stripe webhook through the service-role client.
create or replace function public.sakaba_apply_billing_event(
  p_guild_id uuid,
  p_user_id uuid,
  p_billing_status text,
  p_stripe_customer_id text default null,
  p_stripe_subscription_id text default null,
  p_stripe_price_id text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, sakaba
as $$
begin
  if p_billing_status not in ('free', 'trialing', 'active', 'past_due', 'canceled') then
    raise exception 'invalid billing status' using errcode = '22023';
  end if;

  update sakaba.guild_members gm
  set billing_status = p_billing_status,
      stripe_customer_id = coalesce(nullif(btrim(p_stripe_customer_id), ''), gm.stripe_customer_id),
      stripe_subscription_id = coalesce(nullif(btrim(p_stripe_subscription_id), ''), gm.stripe_subscription_id),
      stripe_price_id = coalesce(nullif(btrim(p_stripe_price_id), ''), gm.stripe_price_id),
      billing_updated_at = now()
  where gm.guild_id = p_guild_id
    and gm.user_id = p_user_id
    and gm.role = 'member'
    and gm.billing_status <> 'exempt'
    and gm.suspended_at is null;

  if not found then
    raise exception 'billable guild membership not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.sakaba_get_my_billing(text) from public;
grant execute on function public.sakaba_get_my_billing(text) to authenticated;

revoke all on function public.sakaba_apply_billing_event(uuid, uuid, text, text, text, text) from public;
revoke all on function public.sakaba_apply_billing_event(uuid, uuid, text, text, text, text) from anon;
revoke all on function public.sakaba_apply_billing_event(uuid, uuid, text, text, text, text) from authenticated;
grant execute on function public.sakaba_apply_billing_event(uuid, uuid, text, text, text, text) to service_role;

notify pgrst, 'reload schema';
