-- 880円会員が会食を組んでもらうために出す、本人とギルドマスターだけの空き日時。
-- ブラウザからのテーブル直接操作は許可しない。アプリのAPIで会員資格と本人確認を行う。

create table if not exists public.sakaba_meal_availability (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null,
  user_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  foreign key (guild_id, user_id)
    references sakaba.guild_members (guild_id, user_id) on delete cascade,
  constraint sakaba_meal_availability_range check (
    ends_at > starts_at and ends_at <= starts_at + interval '8 hours'
  ),
  constraint sakaba_meal_availability_note_length check (char_length(note) <= 120)
);

create index if not exists sakaba_meal_availability_guild_date_idx
  on public.sakaba_meal_availability (guild_id, starts_at, user_id);
create index if not exists sakaba_meal_availability_user_date_idx
  on public.sakaba_meal_availability (guild_id, user_id, starts_at);

alter table public.sakaba_meal_availability enable row level security;
revoke all on public.sakaba_meal_availability from public, anon, authenticated;
grant select, insert, delete on public.sakaba_meal_availability to service_role;

comment on table public.sakaba_meal_availability is
  '880円会員の会食向け空き日時。本人とギルドマスターだけにアプリサーバーから表示する。';

notify pgrst, 'reload schema';
