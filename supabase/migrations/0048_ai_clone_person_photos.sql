-- 0048_ai_clone_person_photos.sql
--
-- 人物に画像を複数保存し、その1枚をアイコン（アバター）に選べるようにする（Facebook式）。
-- 名刺写真・顔写真などをギャラリーで持ち、代表1枚を名前の左の〇に表示。
--
-- 構成:
--   storage バケット ai-clone-people（public）にファイルを置く。
--     パス = {tenant_id}/{person_id}/{ランダム}.{ext}
--   ai_clone_person_photo に1枚=1行で記録。
--   ai_clone_person.avatar_url に「アイコンに選んだ画像」の公開URLを持つ（表示用に直持ち）。

-- 1) 画像レコード
create table if not exists ai_clone_person_photo (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references ai_clone_tenants(id) on delete cascade,
  person_id uuid not null references ai_clone_person(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  created_at timestamptz not null default now()
);
create index on ai_clone_person_photo(tenant_id, person_id);

alter table ai_clone_person_photo enable row level security;
create policy ai_clone_person_photo_select on ai_clone_person_photo for select
  using (ai_clone_is_tenant_member(tenant_id));
create policy ai_clone_person_photo_modify on ai_clone_person_photo for all
  using (ai_clone_is_tenant_member(tenant_id))
  with check (ai_clone_is_tenant_member(tenant_id));

-- 2) アバター（選んだ1枚のURL）
alter table ai_clone_person
  add column if not exists avatar_url text;

-- 3) Storage バケット + RLS（パス1階層目=tenant_id がメンバーのテナントのみ書込可）
insert into storage.buckets (id, name, public)
values ('ai-clone-people', 'ai-clone-people', true)
on conflict (id) do nothing;

drop policy if exists ai_clone_people_photos_read on storage.objects;
create policy ai_clone_people_photos_read on storage.objects
  for select using (bucket_id = 'ai-clone-people');

drop policy if exists ai_clone_people_photos_insert on storage.objects;
create policy ai_clone_people_photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ai-clone-people'
    and ai_clone_is_tenant_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists ai_clone_people_photos_delete on storage.objects;
create policy ai_clone_people_photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'ai-clone-people'
    and ai_clone_is_tenant_member(((storage.foldername(name))[1])::uuid)
  );

notify pgrst, 'reload schema';
