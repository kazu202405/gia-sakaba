-- ============================================================================
-- 0077: GIAの酒場 core schema
--
-- This migration intentionally creates no data-access policies. Every table
-- has RLS enabled and remains deny-by-default until 0078_sakaba_access.sql.
-- ============================================================================

create schema if not exists sakaba;

revoke all on schema sakaba from public, anon, authenticated;
grant usage on schema sakaba to authenticated;

create or replace function sakaba.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --------------------------------------------------------------------------
-- Guild and member profiles
-- --------------------------------------------------------------------------

create table sakaba.guilds (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  terms jsonb not null default jsonb_build_object(
    'member', '仲間',
    'quest', 'クエスト',
    'party', 'パーティ',
    'master', 'ギルドマスター',
    'status', 'ステータス'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guilds_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint guilds_terms_object check (jsonb_typeof(terms) = 'object')
);

create unique index guilds_slug_lower_uidx on sakaba.guilds (lower(slug));

create table sakaba.tags (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  constraint tags_kind_check check (kind in ('industry', 'keyword')),
  constraint tags_name_not_blank check (btrim(name) <> '')
);

create unique index tags_kind_name_lower_uidx
  on sakaba.tags (kind, lower(name));

create table sakaba.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name varchar(30) not null,
  photo_url text,
  headline text not null default '',
  job text not null default '',
  job_icon text not null default 'other',
  region text not null default '',
  bio text not null default '',
  can_help_with text not null default '',
  strengths varchar(200) not null default '',
  values_text text not null default '',
  vision text not null default '',
  social_issue text not null default '',
  looking_for text not null default '',
  want_to_meet text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_not_blank check (btrim(display_name) <> ''),
  constraint profiles_job_icon_check check (job_icon in (
    'web', 'tax', 'build', 'food', 'marketing', 'realestate', 'legal',
    'design', 'teach', 'health', 'owner', 'retail', 'maker', 'beauty',
    'finance', 'logistics', 'care', 'hr', 'farm', 'other'
  ))
);

create table sakaba.profile_contacts (
  user_id uuid primary key references sakaba.profiles(user_id) on delete cascade,
  email text not null default '',
  line_url text not null default '',
  website_url text not null default '',
  updated_at timestamptz not null default now()
);

create table sakaba.profile_tags (
  user_id uuid not null references sakaba.profiles(user_id) on delete cascade,
  tag_id uuid not null references sakaba.tags(id) on delete cascade,
  primary key (user_id, tag_id)
);

create table sakaba.invites (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references sakaba.guilds(id) on delete cascade,
  code text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  max_uses integer not null default 1,
  used_count integer not null default 0,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invites_code_not_blank check (btrim(code) <> ''),
  constraint invites_max_uses_positive check (max_uses > 0),
  constraint invites_used_count_range check (used_count >= 0 and used_count <= max_uses)
);

create unique index invites_guild_code_lower_uidx
  on sakaba.invites (guild_id, lower(code));
create index invites_active_lookup_idx
  on sakaba.invites (guild_id, expires_at)
  where revoked_at is null;

create table sakaba.guild_members (
  guild_id uuid not null references sakaba.guilds(id) on delete cascade,
  user_id uuid not null references sakaba.profiles(user_id) on delete cascade,
  role text not null default 'member',
  visible_groups text[] not null default array['work', 'values', 'connect']::text[],
  accept_intro boolean not null default true,
  company_name varchar(60) not null,
  position text not null,
  show_company boolean not null default true,
  gathering_approved_at timestamptz,
  want_to_solve varchar(60) not null default '',
  show_achievements boolean not null default true,
  members_seen_at timestamptz,
  quests_seen_at timestamptz,
  invite_id uuid references sakaba.invites(id) on delete restrict,
  promises_agreed_at timestamptz not null,
  joined_at timestamptz not null default now(),
  suspended_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (guild_id, user_id),
  constraint guild_members_role_check check (role in ('owner', 'master', 'member')),
  constraint guild_members_position_check check (position in ('ceo', 'officer', 'decider', 'other')),
  constraint guild_members_company_not_blank check (btrim(company_name) <> ''),
  constraint guild_members_invite_required check (role = 'owner' or invite_id is not null),
  constraint guild_members_visible_groups_check check (
    visible_groups <@ array['work', 'values', 'connect']::text[]
  )
);

create index guild_members_user_idx on sakaba.guild_members (user_id);
create index guild_members_active_joined_idx
  on sakaba.guild_members (guild_id, joined_at desc)
  where suspended_at is null;

-- --------------------------------------------------------------------------
-- Quests and introductions
-- --------------------------------------------------------------------------

create table sakaba.quests (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references sakaba.guilds(id) on delete cascade,
  creator_id uuid not null references sakaba.profiles(user_id) on delete restrict,
  title text not null,
  category text not null,
  summary text not null default '',
  body text not null default '',
  region text not null default '',
  deadline date,
  member_limit integer,
  is_urgent boolean not null default false,
  members_only boolean not null default false,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quests_title_not_blank check (btrim(title) <> ''),
  constraint quests_category_check check (category in ('work', 'consult', 'collab', 'info', 'gathering')),
  constraint quests_status_check check (status in ('open', 'in_progress', 'completed', 'withdrawn')),
  constraint quests_member_limit_positive check (member_limit is null or member_limit > 0),
  constraint quests_gathering_members_only check (not members_only or category = 'gathering')
);

create index quests_guild_status_created_idx
  on sakaba.quests (guild_id, status, created_at desc);
create index quests_creator_idx on sakaba.quests (creator_id, created_at desc);
create index quests_deadline_idx on sakaba.quests (guild_id, deadline) where deadline is not null;

create table sakaba.quest_applications (
  quest_id uuid not null references sakaba.quests(id) on delete cascade,
  user_id uuid not null references sakaba.profiles(user_id) on delete cascade,
  message varchar(200) not null default '',
  status text not null default 'applied',
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  declined_at timestamptz,
  declined_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (quest_id, user_id),
  constraint quest_applications_status_check check (status in ('applied', 'withdrawn')),
  constraint quest_applications_decision_exclusive check (approved_at is null or declined_at is null)
);

create index quest_applications_user_idx
  on sakaba.quest_applications (user_id, created_at desc);
create index quest_applications_pending_idx
  on sakaba.quest_applications (quest_id, created_at)
  where status = 'applied' and approved_at is null and declined_at is null;

create table sakaba.intro_requests (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references sakaba.guilds(id) on delete cascade,
  requester_id uuid not null references sakaba.profiles(user_id) on delete restrict,
  target_id uuid not null references sakaba.profiles(user_id) on delete restrict,
  quest_id uuid references sakaba.quests(id) on delete set null,
  purpose text not null,
  message text not null default '',
  status text not null default 'requested',
  outcome text,
  redirected_from_id uuid references sakaba.intro_requests(id) on delete set null,
  proposed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intro_requests_people_differ check (requester_id <> target_id),
  constraint intro_requests_purpose_check check (purpose in ('work', 'consult', 'collab', 'info')),
  constraint intro_requests_status_check check (status in (
    'requested', 'reviewing', 'proposed', 'accepted', 'introduced',
    'declined_by_master', 'declined_by_target', 'expired', 'redirected', 'cancelled'
  )),
  constraint intro_requests_outcome_check check (outcome is null or outcome in ('met', 'working', 'no_fit')),
  constraint intro_requests_outcome_after_intro check (outcome is null or status = 'introduced')
);

create index intro_requests_requester_idx
  on sakaba.intro_requests (requester_id, updated_at desc);
create index intro_requests_target_idx
  on sakaba.intro_requests (target_id, updated_at desc);
create index intro_requests_master_queue_idx
  on sakaba.intro_requests (guild_id, status, updated_at desc);
create index intro_requests_quest_idx
  on sakaba.intro_requests (quest_id) where quest_id is not null;

create table sakaba.intro_request_notes (
  id uuid primary key default gen_random_uuid(),
  intro_request_id uuid not null references sakaba.intro_requests(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intro_request_notes_body_not_blank check (btrim(body) <> '')
);

create index intro_request_notes_request_idx
  on sakaba.intro_request_notes (intro_request_id, created_at);

create table sakaba.parties (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references sakaba.guilds(id) on delete cascade,
  quest_id uuid not null unique references sakaba.quests(id) on delete cascade,
  name text not null,
  formed_at timestamptz not null default now(),
  constraint parties_name_not_blank check (btrim(name) <> '')
);

create table sakaba.party_members (
  party_id uuid not null references sakaba.parties(id) on delete cascade,
  user_id uuid not null references sakaba.profiles(user_id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (party_id, user_id)
);

-- --------------------------------------------------------------------------
-- Private projects
-- --------------------------------------------------------------------------

create table sakaba.projects (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references sakaba.guilds(id) on delete cascade,
  owner_id uuid not null references sakaba.profiles(user_id) on delete cascade,
  title varchar(40) not null,
  goal varchar(200) not null default '',
  memo varchar(500) not null default '',
  source_quest_id uuid references sakaba.quests(id) on delete set null,
  status text not null default 'active',
  start_date date not null default current_date,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  done_at timestamptz,
  constraint projects_title_not_blank check (btrim(title) <> ''),
  constraint projects_status_check check (status in ('active', 'done')),
  constraint projects_date_order check (due_date is null or due_date >= start_date),
  constraint projects_done_at_consistent check (
    (status = 'done' and done_at is not null) or (status = 'active' and done_at is null)
  )
);

create unique index projects_source_quest_uidx
  on sakaba.projects (source_quest_id) where source_quest_id is not null;
create index projects_owner_idx on sakaba.projects (owner_id, created_at desc);

create table sakaba.project_members (
  project_id uuid not null references sakaba.projects(id) on delete cascade,
  user_id uuid not null references sakaba.profiles(user_id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index project_members_user_idx on sakaba.project_members (user_id, project_id);

create table sakaba.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references sakaba.projects(id) on delete cascade,
  title text not null,
  status text not null default 'todo',
  assignee_id uuid references sakaba.profiles(user_id) on delete set null,
  start_date date,
  due_date date,
  sort_order integer not null default 0,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_tasks_title_not_blank check (btrim(title) <> ''),
  constraint project_tasks_status_check check (status in ('todo', 'done')),
  constraint project_tasks_date_order check (due_date is null or start_date is null or due_date >= start_date),
  constraint project_tasks_done_at_consistent check (
    (status = 'done' and done_at is not null) or (status = 'todo' and done_at is null)
  )
);

create index project_tasks_project_order_idx
  on sakaba.project_tasks (project_id, status, sort_order, created_at);
create index project_tasks_assignee_due_idx
  on sakaba.project_tasks (assignee_id, due_date)
  where status = 'todo' and due_date is not null;

create table sakaba.project_steps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references sakaba.projects(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint project_steps_name_not_blank check (btrim(name) <> ''),
  unique (project_id, id)
);

create index project_steps_project_order_idx
  on sakaba.project_steps (project_id, sort_order, created_at);

create table sakaba.project_contacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references sakaba.projects(id) on delete cascade,
  label text not null,
  memo text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_contacts_label_not_blank check (btrim(label) <> ''),
  unique (project_id, id)
);

create index project_contacts_project_order_idx
  on sakaba.project_contacts (project_id, sort_order, created_at);

create table sakaba.project_step_records (
  project_id uuid not null references sakaba.projects(id) on delete cascade,
  contact_id uuid not null,
  step_id uuid not null,
  planned_on date,
  done_on date,
  updated_at timestamptz not null default now(),
  primary key (contact_id, step_id),
  foreign key (project_id, contact_id)
    references sakaba.project_contacts(project_id, id) on delete cascade,
  foreign key (project_id, step_id)
    references sakaba.project_steps(project_id, id) on delete cascade,
  constraint project_step_records_not_empty check (planned_on is not null or done_on is not null)
);

create index project_step_records_project_idx
  on sakaba.project_step_records (project_id, contact_id, step_id);

-- --------------------------------------------------------------------------
-- In-app notifications
-- --------------------------------------------------------------------------

create table sakaba.notifications (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references sakaba.guilds(id) on delete cascade,
  user_id uuid not null references sakaba.profiles(user_id) on delete cascade,
  kind text not null,
  actor_id uuid references sakaba.profiles(user_id) on delete set null,
  quest_id uuid references sakaba.quests(id) on delete cascade,
  intro_request_id uuid references sakaba.intro_requests(id) on delete cascade,
  intro_status text,
  changed_fields text[] not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_kind_check check (kind in (
    'quest_applied', 'quest_updated', 'quest_withdrawn', 'intro_progress',
    'gathering_approved', 'gathering_declined'
  )),
  constraint notifications_intro_status_check check (intro_status is null or intro_status in (
    'requested', 'reviewing', 'proposed', 'accepted', 'introduced',
    'declined_by_master', 'declined_by_target', 'expired', 'redirected', 'cancelled'
  )),
  constraint notifications_changed_fields_check check (
    changed_fields <@ array[
      'category', 'title', 'summary', 'body', 'region', 'deadline',
      'member_limit', 'is_urgent'
    ]::text[]
  )
);

create index notifications_user_unread_idx
  on sakaba.notifications (user_id, created_at desc)
  where read_at is null;
create index notifications_user_created_idx
  on sakaba.notifications (user_id, created_at desc);

-- --------------------------------------------------------------------------
-- updated_at triggers
-- --------------------------------------------------------------------------

create trigger guilds_set_updated_at
before update on sakaba.guilds
for each row execute function sakaba.set_updated_at();

create trigger profiles_set_updated_at
before update on sakaba.profiles
for each row execute function sakaba.set_updated_at();

create trigger profile_contacts_set_updated_at
before update on sakaba.profile_contacts
for each row execute function sakaba.set_updated_at();

create trigger guild_members_set_updated_at
before update on sakaba.guild_members
for each row execute function sakaba.set_updated_at();

create trigger quests_set_updated_at
before update on sakaba.quests
for each row execute function sakaba.set_updated_at();

create trigger quest_applications_set_updated_at
before update on sakaba.quest_applications
for each row execute function sakaba.set_updated_at();

create trigger intro_requests_set_updated_at
before update on sakaba.intro_requests
for each row execute function sakaba.set_updated_at();

create trigger intro_request_notes_set_updated_at
before update on sakaba.intro_request_notes
for each row execute function sakaba.set_updated_at();

create trigger projects_set_updated_at
before update on sakaba.projects
for each row execute function sakaba.set_updated_at();

create trigger project_tasks_set_updated_at
before update on sakaba.project_tasks
for each row execute function sakaba.set_updated_at();

create trigger project_contacts_set_updated_at
before update on sakaba.project_contacts
for each row execute function sakaba.set_updated_at();

create trigger project_step_records_set_updated_at
before update on sakaba.project_step_records
for each row execute function sakaba.set_updated_at();

-- --------------------------------------------------------------------------
-- RLS: enabled now, policies follow in 0078.
-- --------------------------------------------------------------------------

alter table sakaba.guilds enable row level security;
alter table sakaba.profiles enable row level security;
alter table sakaba.profile_contacts enable row level security;
alter table sakaba.tags enable row level security;
alter table sakaba.profile_tags enable row level security;
alter table sakaba.invites enable row level security;
alter table sakaba.guild_members enable row level security;
alter table sakaba.quests enable row level security;
alter table sakaba.quest_applications enable row level security;
alter table sakaba.intro_requests enable row level security;
alter table sakaba.intro_request_notes enable row level security;
alter table sakaba.parties enable row level security;
alter table sakaba.party_members enable row level security;
alter table sakaba.projects enable row level security;
alter table sakaba.project_members enable row level security;
alter table sakaba.project_tasks enable row level security;
alter table sakaba.project_steps enable row level security;
alter table sakaba.project_contacts enable row level security;
alter table sakaba.project_step_records enable row level security;
alter table sakaba.notifications enable row level security;

revoke all on all tables in schema sakaba from anon, authenticated;
revoke all on all sequences in schema sakaba from anon, authenticated;

-- Stable id used by the application and later seed/RPC migrations.
insert into sakaba.guilds (id, slug, name)
values ('00000000-0000-4000-8000-000000000001', 'gia', 'GIAの酒場')
on conflict (id) do nothing;
