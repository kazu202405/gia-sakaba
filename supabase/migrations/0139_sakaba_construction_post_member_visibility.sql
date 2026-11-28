-- 建設・不動産の酒場の案件に「この酒場の会員全員」を追加する。
-- 既存の案件・初期値を保持し、有効な同店の会員にだけ公開する。
begin;

alter table sakaba.construction_posts
  drop constraint construction_posts_visibility_check,
  add constraint construction_posts_visibility_check
    check (visibility in ('friends', 'friends2', 'members'));

create or replace function sakaba.construction_can_read_post(p_guild uuid, p_author uuid, p_visibility text, p_viewer uuid)
returns boolean
language sql stable
set search_path = ''
as $$
  select sakaba.is_active_member(p_guild, p_viewer)
    and sakaba.is_active_member(p_guild, p_author)
    and (
      p_visibility = 'members'
      or p_author = p_viewer
      or exists (select 1 from sakaba.construction_friends(p_guild, p_viewer) f where f.friend_id = p_author)
      or (p_visibility = 'friends2' and exists (
        select 1
        from sakaba.construction_friends(p_guild, p_viewer) first_hop
        cross join lateral sakaba.construction_friends(p_guild, first_hop.friend_id) second_hop
        where second_hop.friend_id = p_author
          and sakaba.construction_network_level(p_guild, first_hop.friend_id, p_author) in ('open', 'intro')
      ))
    )
$$;

commit;
