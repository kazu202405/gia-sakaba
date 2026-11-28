-- 0139 を適用したローカル検証DB専用。auth.uid() は test.uid の UUID を返すこと。
begin;
set local plpgsql.check_asserts = on;

do $$
declare
  v_gia uuid := (select g.id from sakaba.guilds g where g.slug = 'gia');
  v_ken uuid := (select g.id from sakaba.guilds g where g.slug = 'kensetsu-fudosan');
  v_a uuid := gen_random_uuid();
  v_b uuid := gen_random_uuid();
  v_c uuid := gen_random_uuid();
  v_d uuid := gen_random_uuid();
  v_gia_only uuid := gen_random_uuid();
  v_invite uuid;
  v_gia_invite uuid;
  v_company uuid;
  v_direct uuid;
  v_route uuid;
  v_post uuid;
  v_friends_post uuid;
  v_members_post uuid;
  v_prefectures text[];
  v_prefecture text;
  v_intro uuid;
begin
  insert into auth.users (id, email)
  select id, id::text || '@construction-test.invalid' from unnest(array[v_a,v_b,v_c,v_d,v_gia_only]) u(id);
  insert into sakaba.profiles (user_id, display_name)
  select id, label from (values (v_a,'依頼者'), (v_b,'紹介者'), (v_c,'非公開の会社名'), (v_d,'他会員'), (v_gia_only,'GIA会員')) u(id,label);
  insert into sakaba.invites (guild_id, code, created_by, max_uses)
  values (v_ken, 'CONSTRUCTION-SQL-TEST', v_a, 4) returning id into v_invite;
  insert into sakaba.invites (guild_id, code, created_by, max_uses)
  values (v_gia, 'GIA-CONSTRUCTION-SQL-TEST', v_gia_only, 1) returning id into v_gia_invite;
  insert into sakaba.guild_members (guild_id, user_id, company_name, position, promises_agreed_at, invite_id)
  select v_ken, id, '検証用', 'other', now(), v_invite from unnest(array[v_a,v_b,v_c,v_d]) u(id);
  insert into sakaba.guild_members (guild_id, user_id, company_name, position, promises_agreed_at, invite_id)
  values (v_gia, v_gia_only, '検証用', 'other', now(), v_gia_invite);
  insert into sakaba.guild_profiles (guild_id, user_id, display_name, industry)
  select v_ken, id, '検証会員', case when id = v_c then '名前を含む未承認の自由入力' else '建設' end
  from unnest(array[v_a,v_b,v_c,v_d]) u(id)
  on conflict (guild_id, user_id) do update set industry = excluded.industry;

  assert (select count(*) = 47 from sakaba.construction_prefectures), '47 prefectures';
  assert not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'sakaba' and c.relkind = 'r' and c.relname like 'construction\_%'
      and (not c.relrowsecurity or has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE'))
  ), 'RLS and no direct table access';
  assert not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'sakaba\_construction\_%'
      and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('service_role', p.oid, 'EXECUTE'))
  ), 'RPC grants only to authenticated clients';
  raise notice 'PASS: prefecture master and RPC/table permissions';

  set local role authenticated;
  perform set_config('test.uid', v_a::text, true);
  v_company := public.sakaba_construction_save_my_company(
    'テスト建設', '東京都', array['建設'], array['東京都', '神奈川県'],
    '改修', 'https://example.test', '役員',
    '[{"kind":"建設業許可","issuer":"東京都","number":"123","verified_at":"2025-01-01"}]'::jsonb
  );
  assert (select c.areas @> array['東京都','神奈川県'] and c.licenses->0->>'verified' = 'false'
    from public.sakaba_construction_list_companies() c where c.id = v_company), 'owner inputs cannot verify own license';
  assert public.sakaba_construction_save_my_company(
    'テスト建設', '東京都', array['建設'], array['東京都']
  ) = v_company, 'same user updates same company';
  begin
    perform 1 from sakaba.construction_companies;
    raise exception 'Raw table access was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.sakaba_construction_request_connection(v_gia_only);
    raise exception 'Cross-store connection was allowed';
  exception when insufficient_privilege then null;
  end;
  v_direct := public.sakaba_construction_request_connection(v_b);
  assert public.sakaba_construction_request_connection(v_b) = v_direct, 'retry deduplicates';
  begin
    perform public.sakaba_construction_answer_connection(v_direct, true);
    raise exception 'The requester could approve their own connection';
  exception when insufficient_privilege then null;
  end;
  perform set_config('test.uid', v_b::text, true);
  perform public.sakaba_construction_answer_connection(v_direct, true);
  v_route := public.sakaba_construction_request_connection(v_c);
  perform set_config('test.uid', v_c::text, true);
  perform public.sakaba_construction_answer_connection(v_route, true);
  raise notice 'PASS: company ownership, license and same-store mutual consent';

  perform set_config('test.uid', v_a::text, true);
  v_post := public.sakaba_construction_create_post(
    '外壁を改修したい', 'request-work', '建設', '工事内容', '案件用連絡先', array['東京都','神奈川県','大阪府']
  );
  v_friends_post := public.sakaba_construction_create_post(
    '直接の知り合いまで', 'other', '建設', '限定の案件', '限定連絡先', array['東京都'], 'friends'
  );
  begin
    perform public.sakaba_construction_create_post('無効な地域', 'other', '建設', '本文', '連絡先', array['関東']);
    raise exception 'A non-prefecture was accepted';
  exception when foreign_key_violation then null;
  end;
  assert (select count(*) = 2 from public.sakaba_construction_list_posts()), 'invalid area rolls back post too';
  assert (select p.areas @> array['東京都','神奈川県','大阪府'] from public.sakaba_construction_list_posts(v_post) p),
    'prefecture precision is preserved';
  assert (select count(*) = 1 from public.sakaba_construction_list_posts(p_prefecture => '大阪府')), 'filter by prefecture';

  perform set_config('test.uid', v_b::text, true);
  assert (select count(*) = 2 from public.sakaba_construction_list_posts()), 'direct friend sees both scopes';
  assert public.sakaba_construction_reply(v_post, 'can', '対応できます'), 'first reply is saved';
  assert not public.sakaba_construction_reply(v_post, 'can', '二重送信'), 'same reply kind deduplicates';
  perform public.sakaba_construction_set_network_visibility('hidden', v_a);
  assert public.sakaba_construction_get_network_visibility()->'overrides'->>v_a::text = 'hidden', 'my settings round-trip';
  perform set_config('test.uid', v_c::text, true);
  assert (select count(*) = 0 from public.sakaba_construction_list_posts()), 'hidden route does not disclose contact or title';
  assert (select count(*) = 0 from public.sakaba_construction_list_replies(v_post)), 'reply list inherits post visibility';
  begin
    perform public.sakaba_construction_reply(v_post, 'know', '許可のない返信');
    raise exception 'Hidden post accepted a reply';
  exception when insufficient_privilege then null;
  end;
  perform set_config('test.uid', v_b::text, true);
  perform public.sakaba_construction_set_network_visibility(null, v_a);
  perform public.sakaba_construction_set_network_visibility('masked', v_c);
  perform set_config('test.uid', v_c::text, true);
  assert (select count(*) = 1 from public.sakaba_construction_list_posts()), 'two-hop viewer sees friends2 only';
  assert (select count(*) = 1 from public.sakaba_construction_list_replies(v_post)), 'this audience sees reply content';

  perform set_config('test.uid', v_d::text, true);
  assert (select count(*) = 0 from public.sakaba_construction_list_posts(v_post)), 'unconnected member sees no post';
  perform set_config('test.uid', v_gia_only::text, true);
  begin
    perform 1 from public.sakaba_construction_list_posts(v_post);
    raise exception 'GIA-only member could read construction posts';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.sakaba_construction_create_post('越境', 'other', '建設', '本文', '連絡先', array['東京都']);
    raise exception 'GIA-only member could create a construction post';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: prefecture atomicity, direct and two-hop access, visibility controls, reply deduplication, store boundary';

  perform set_config('test.uid', v_a::text, true);
  assert (select c.masked and c.target_id is null and c.label = '氏名非公開'
    from public.sakaba_construction_list_intro_candidates(v_b) c where c.route_id = v_route), 'masked candidate omits identity and free text';
  v_intro := public.sakaba_construction_request_intro(v_b, v_route, '工事を相談したい');
  begin
    perform public.sakaba_construction_request_intro(v_b, v_route, '二重依頼');
    raise exception 'Duplicate open introduction';
  exception when unique_violation then null;
  end;
  assert (select i.masked and i.target_id is null and jsonb_array_length(i.events) = 1
    from public.sakaba_construction_list_intros() i where i.id = v_intro), 'requester sees masked request';
  perform set_config('test.uid', v_c::text, true);
  assert (select count(*) = 0 from public.sakaba_construction_list_intros()), 'target cannot read before intermediary approves';
  begin
    perform public.sakaba_construction_answer_intro(v_intro, true);
    raise exception 'Target skipped the intermediary';
  exception when insufficient_privilege then null;
  end;
  perform set_config('test.uid', v_b::text, true);
  begin
    perform public.sakaba_construction_answer_intro(v_intro, true, '', 'fixed', 0);
    raise exception 'Invalid fee entered';
  exception when check_violation then null;
  end;
  assert public.sakaba_construction_answer_intro(v_intro, true, '匿名の相手の実名を書いた場合', 'none') = 'asking_target',
    'intermediary can approve';
  perform set_config('test.uid', v_a::text, true);
  assert (select i.target_id is null and i.events->1->>'note' = ''
    from public.sakaba_construction_list_intros() i where i.id = v_intro), 'response free text hidden while masked';
  perform set_config('test.uid', v_d::text, true);
  assert (select count(*) = 0 from public.sakaba_construction_list_intros()), 'unrelated member sees no intro history';
  perform set_config('test.uid', v_c::text, true);
  assert public.sakaba_construction_answer_intro(v_intro, true, '承諾') = 'connected', 'target can approve after intermediary';
  perform set_config('test.uid', v_a::text, true);
  assert (select i.target_id = v_c and not i.masked and jsonb_array_length(i.events) = 3
    from public.sakaba_construction_list_intros() i where i.id = v_intro), 'consent reveals target and preserves history';
  assert exists (select 1 from public.sakaba_construction_list_my_connections() c where c.friend_id = v_c and c.status = 'connected'),
    'approval atomically adds direct connection';

  perform public.sakaba_construction_withdraw_post(v_friends_post);
  assert (select count(*) = 0 from public.sakaba_construction_list_posts(v_friends_post)), 'withdrawn post is hidden';
  raise notice 'PASS: masked introductions, two-party approval, immutable events, and post withdrawal';

  reset role;
  -- 0138 も適用した検証DBでは、通知と既存Web Pushへの受け渡しを確認する。
  if to_regprocedure('sakaba.construction_notify_intro()') is not null then
    assert (select count(*) = 8 and bool_and(n.actor_id is null)
      from sakaba.notifications n where n.guild_id = v_ken and n.user_id in (v_a, v_b, v_c)
        and n.kind like 'construction_%'),
      'eight notices, with no exposed actor identity and no duplicate reply notice';
    assert (select count(*) = 1 from sakaba.notifications n
      where n.guild_id = v_ken and n.user_id = v_a and n.kind = 'construction_reply'),
      'reply notifies the author exactly once';
    assert (select count(*) = 1 from sakaba.notifications n
      where n.guild_id = v_ken and n.user_id = v_c and n.kind = 'construction_intro_request'),
      'target is notified only after the intermediary agrees';
    assert not exists (select 1 from sakaba.notifications n
      where n.user_id in (v_d, v_gia_only) and n.kind like 'construction_%'), 'unrelated accounts do not receive notices';
    set local role service_role;
    assert (select count(*) = 1 from public.sakaba_push_candidates() p
      where p.user_id = v_a and p.href = '/guild/kensetsu-fudosan/posts' and p.body = '案件に返信が届きました'),
      'the notification is sent to the production posts path';
    assert (select count(*) = 1 from public.sakaba_push_candidates() p
      where p.user_id = v_c and p.href = '/guild/kensetsu-fudosan/network' and p.body = '紹介依頼が届きました'),
      'push to the target has a generic body and the production interactions path';
    reset role;
    raise notice 'PASS: recipient isolation, deduplication and Web Push candidates for 0138';
  end if;
  select array_agg(p.name order by p.name) into v_prefectures from sakaba.construction_prefectures p;
  set local role authenticated;
  perform set_config('test.uid', v_a::text, true);
  v_members_post := public.sakaba_construction_create_post(
    '全国の協力会社を募集', 'seek-partner', '建設', '案件の本文', '案件用連絡先', v_prefectures, 'members'
  );
  perform set_config('test.uid', v_d::text, true);
  assert (select p.visibility = 'members' and p.areas = v_prefectures and cardinality(p.areas) = 47
    and p.contact = '案件用連絡先' from public.sakaba_construction_list_posts(v_members_post) p),
    'unconnected active member sees all 47 prefectures and the post contact';
  foreach v_prefecture in array v_prefectures loop
    assert exists (select 1 from public.sakaba_construction_list_posts(p_post_id => v_members_post, p_prefecture => v_prefecture)),
      'nationwide post matches each prefecture filter';
  end loop;
  assert public.sakaba_construction_reply(v_members_post, 'know', '紹介できます'), 'unconnected member can reply';
  perform set_config('test.uid', v_a::text, true);
  assert exists (select 1 from public.sakaba_construction_list_replies(v_members_post) where author_id = v_d), 'author can see the reply';
  perform set_config('test.uid', v_gia_only::text, true);
  begin
    perform 1 from public.sakaba_construction_list_posts(v_members_post);
    raise exception 'GIA-only member could read member-wide construction post';
  exception when insufficient_privilege then null;
  end;
  reset role;

  update sakaba.guild_members m set suspended_at = now() where m.guild_id = v_ken and m.user_id = v_a;
  set local role authenticated;
  perform set_config('test.uid', v_a::text, true);
  begin
    perform 1 from public.sakaba_construction_list_intros();
    raise exception 'Suspended member accessed intros';
  exception when insufficient_privilege then null;
  end;
  perform set_config('test.uid', v_d::text, true);
  assert not exists (select 1 from public.sakaba_construction_list_posts(v_members_post)), 'inactive author remains hidden from all members';
  assert not exists (select 1 from public.sakaba_construction_list_replies(v_members_post)), 'replies also remain hidden';
  raise notice 'PASS: member-wide nationwide posts, replies and filters, store isolation, suspended member denied';
  reset role;
end;
$$;

rollback;
