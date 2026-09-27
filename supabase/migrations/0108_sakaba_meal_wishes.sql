-- 880円会員の「会食の希望」。本人とギルドマスターだけにサーバーから表示する。
-- 権限判定はアプリのサーバーで、Stripeから反映された実際のPrice IDを確認する。

create table if not exists public.sakaba_meal_wishes (
  guild_id uuid not null,
  user_id uuid not null,
  wish_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (guild_id, user_id),
  foreign key (guild_id, user_id)
    references sakaba.guild_members (guild_id, user_id) on delete cascade,
  constraint sakaba_meal_wishes_length check (char_length(btrim(wish_text)) between 1 and 500)
);

create index if not exists sakaba_meal_wishes_updated_idx
  on public.sakaba_meal_wishes (guild_id, updated_at desc);

alter table public.sakaba_meal_wishes enable row level security;
revoke all on public.sakaba_meal_wishes from public, anon, authenticated;
grant select, insert, update, delete on public.sakaba_meal_wishes to service_role;

comment on table public.sakaba_meal_wishes is
  '酒場880円会員がギルドマスターへ届ける会食の希望。開催やマッチングを保証しない。';

notify pgrst, 'reload schema';
