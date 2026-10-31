create table if not exists public.training_levels (
  id smallint primary key,
  slug text not null unique,
  label text not null,
  description text not null default '',
  sort_order smallint not null,
  self_booking_allowed boolean not null default true,
  active boolean not null default true
);

insert into public.training_levels (id, slug, label, description, sort_order, self_booking_allowed)
values
  (0, 'unassessed', 'Hindamata', 'Uus ratsanik või tase vajab treeneri kinnitust.', 0, false),
  (1, 'intro', 'Algõpe', 'Põhioskuste õppimine treeneri tihedama juhendamisega.', 1, true),
  (2, 'independent_beginner', 'Iseseisev algtase', 'Ratsanik saab grupis põhiharjutustega iseseisvamalt hakkama.', 2, true),
  (3, 'foundation', 'Põhitase', 'Kindlam iseseisev ratsutamine ja tavapärane grupitöö.', 3, true),
  (4, 'advanced', 'Edasijõudnute tase', 'Tehnilisem töö ja keerulisemad harjutused.', 4, true),
  (5, 'sport', 'Spordi- ja võistlustase', 'Selge sportliku või võistlusliku eesmärgiga treening.', 5, true)
on conflict (id) do update
set slug = excluded.slug,
    label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order,
    self_booking_allowed = excluded.self_booking_allowed,
    active = excluded.active;

create table if not exists public.training_policies (
  id text primary key,
  timezone text not null default 'Europe/Tallinn',
  credit_cutoff_days_before smallint not null default 1 check (credit_cutoff_days_before >= 0),
  credit_cutoff_time time not null default '20:00',
  credit_expiry_months_after_session smallint not null default 1 check (credit_expiry_months_after_session >= 0),
  default_group_capacity smallint not null default 7 check (default_group_capacity > 0),
  waitlist_capacity smallint not null default 2 check (waitlist_capacity >= 0),
  offer_hours_same_day smallint not null default 1 check (offer_hours_same_day > 0),
  offer_hours_previous_day smallint not null default 3 check (offer_hours_previous_day > 0),
  offer_hours_earlier smallint not null default 6 check (offer_hours_earlier > 0),
  no_new_offer_minutes_before integer not null default 60 check (no_new_offer_minutes_before >= 0),
  registration_minutes_before integer not null default 30 check (registration_minutes_before >= 0),
  customer_notifications_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.training_policies (id)
values ('main')
on conflict (id) do nothing;

comment on column public.training_policies.customer_notifications_enabled is
  'Safety switch for group-training customer notifications. Keep false during testing.';

create table if not exists public.rider_contacts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  legal_name text not null,
  birth_date date,
  email text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists rider_contacts_email_unique_idx
  on public.rider_contacts (lower(email)) where email is not null;

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text not null,
  birth_date date,
  level_id smallint not null default 0 references public.training_levels(id),
  level_reviewed_at timestamptz,
  level_reviewed_by uuid references auth.users(id) on delete set null,
  profile_state text not null default 'basic'
    check (profile_state in ('basic', 'complete', 'needs_merge', 'archived')),
  source text not null default 'manual',
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists riders_name_birth_unique_idx
  on public.riders (lower(legal_name), coalesce(birth_date, date '0001-01-01'));

create table if not exists public.rider_contact_links (
  rider_id uuid not null references public.riders(id) on delete cascade,
  contact_id uuid not null references public.rider_contacts(id) on delete cascade,
  relationship text not null check (relationship in ('self', 'parent', 'guardian', 'other')),
  receives_notifications boolean not null default true,
  primary_contact boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (rider_id, contact_id)
);

create table if not exists public.rider_contracts (
  id uuid primary key default gen_random_uuid(),
  contract_number text not null unique,
  customer_contact_id uuid references public.rider_contacts(id) on delete set null,
  start_date date,
  first_term_end date,
  auto_renews boolean not null default true,
  source_reference text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rider_contract_members (
  contract_id uuid not null references public.rider_contracts(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  primary key (contract_id, rider_id)
);

create table if not exists public.rider_contract_terms (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.rider_contracts(id) on delete cascade,
  effective_from date not null,
  weekly_sessions smallint check (weekly_sessions is null or weekly_sessions >= 0),
  monthly_price_cents integer check (monthly_price_cents is null or monthly_price_cents >= 0),
  source_reference text,
  created_at timestamptz not null default now(),
  unique (contract_id, effective_from)
);

create table if not exists public.training_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  format text not null default 'group' check (format in ('group', 'private', 'other')),
  default_capacity smallint not null default 7 check (default_capacity > 0),
  classification_status text not null default 'needs_review'
    check (classification_status in ('needs_review', 'classified')),
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_group_levels (
  group_id uuid not null references public.training_groups(id) on delete cascade,
  level_id smallint not null references public.training_levels(id),
  primary key (group_id, level_id)
);

create table if not exists public.training_group_slots (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.training_groups(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  duration_minutes smallint not null default 50 check (duration_minutes > 0),
  timezone text not null default 'Europe/Tallinn',
  capacity_override smallint check (capacity_override is null or capacity_override > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, weekday, start_time)
);

create table if not exists public.training_group_memberships (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.riders(id) on delete cascade,
  slot_id uuid not null references public.training_group_slots(id) on delete cascade,
  status text not null default 'suggested' check (status in ('suggested', 'active', 'inactive')),
  confidence text not null default 'low' check (confidence in ('low', 'medium', 'high', 'confirmed')),
  source text not null default 'manual',
  starts_on date,
  ends_on date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rider_id, slot_id)
);

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.training_groups(id) on delete set null,
  slot_id uuid references public.training_group_slots(id) on delete set null,
  title text not null default '',
  format text not null default 'group' check (format in ('group', 'private', 'other')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity smallint not null default 7 check (capacity > 0),
  status text not null default 'open' check (status in ('open', 'cancelled', 'completed')),
  horse_assignment_state text not null default 'draft' check (horse_assignment_state in ('draft', 'published')),
  cancellation_credit_mode text check (cancellation_credit_mode in ('all', 'none')),
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists training_sessions_starts_idx on public.training_sessions (starts_at);

create table if not exists public.training_bookings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  booking_kind text not null check (booking_kind in ('recurring', 'makeup', 'manual')),
  status text not null default 'confirmed'
    check (status in ('pending_trainer', 'confirmed', 'cancelled_on_time', 'cancelled_late', 'attended', 'no_show')),
  source text not null default 'manual',
  cancelled_at timestamptz,
  cancellation_credit_eligible boolean,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, rider_id)
);

create table if not exists public.training_credits (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.riders(id) on delete cascade,
  source_booking_id uuid references public.training_bookings(id) on delete set null,
  state text not null default 'available'
    check (state in ('available', 'reserved', 'used', 'expired', 'revoked')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_booking_id uuid references public.training_bookings(id) on delete set null,
  override_reason text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists training_credits_rider_state_idx
  on public.training_credits (rider_id, state, expires_at);

create table if not exists public.training_waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  credit_id uuid not null references public.training_credits(id) on delete cascade,
  status text not null default 'waiting'
    check (status in ('waiting', 'offered', 'confirmed', 'declined', 'expired', 'cancelled', 'invalidated_credit_used')),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, rider_id)
);

create index if not exists training_waitlist_order_idx
  on public.training_waitlist_entries (session_id, status, joined_at);

create table if not exists public.training_waitlist_offers (
  id uuid primary key default gen_random_uuid(),
  waitlist_entry_id uuid not null references public.training_waitlist_entries(id) on delete cascade,
  offered_at timestamptz not null default now(),
  expires_at timestamptz,
  response text check (response in ('confirmed', 'declined', 'expired')),
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

comment on column public.training_waitlist_offers.expires_at is
  'NULL means the offer remains valid because no other rider is waiting. No new offer is sent during the last 60 minutes before training.';

create table if not exists public.training_horse_assignments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  horse_id uuid not null references public.horses(id) on delete restrict,
  state text not null default 'draft' check (state in ('draft', 'published')),
  source text not null default 'manual' check (source in ('manual', 'recommended', 'automatic')),
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, rider_id)
);

create table if not exists public.horse_aliases (
  alias text primary key,
  horse_id uuid not null references public.horses(id) on delete cascade,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

create table if not exists public.rider_horse_history_summary (
  rider_id uuid not null references public.riders(id) on delete cascade,
  horse_id uuid not null references public.horses(id) on delete cascade,
  assignment_count integer not null default 0 check (assignment_count >= 0),
  source_period text not null default '',
  source text not null default 'excel_history',
  updated_at timestamptz not null default now(),
  primary key (rider_id, horse_id)
);

create table if not exists public.training_notifications (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid references public.riders(id) on delete cascade,
  contact_id uuid references public.rider_contacts(id) on delete cascade,
  session_id uuid references public.training_sessions(id) on delete cascade,
  kind text not null,
  channel text not null check (channel in ('email', 'sms', 'in_app')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'cancelled')),
  payload jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.training_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  reason text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.training_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists training_policies_updated_at on public.training_policies;
create trigger training_policies_updated_at before update on public.training_policies
for each row execute function public.training_set_updated_at();

drop trigger if exists rider_contacts_updated_at on public.rider_contacts;
create trigger rider_contacts_updated_at before update on public.rider_contacts
for each row execute function public.training_set_updated_at();

drop trigger if exists riders_updated_at on public.riders;
create trigger riders_updated_at before update on public.riders
for each row execute function public.training_set_updated_at();

drop trigger if exists rider_contracts_updated_at on public.rider_contracts;
create trigger rider_contracts_updated_at before update on public.rider_contracts
for each row execute function public.training_set_updated_at();

drop trigger if exists training_groups_updated_at on public.training_groups;
create trigger training_groups_updated_at before update on public.training_groups
for each row execute function public.training_set_updated_at();

drop trigger if exists training_group_slots_updated_at on public.training_group_slots;
create trigger training_group_slots_updated_at before update on public.training_group_slots
for each row execute function public.training_set_updated_at();

drop trigger if exists training_group_memberships_updated_at on public.training_group_memberships;
create trigger training_group_memberships_updated_at before update on public.training_group_memberships
for each row execute function public.training_set_updated_at();

drop trigger if exists training_sessions_updated_at on public.training_sessions;
create trigger training_sessions_updated_at before update on public.training_sessions
for each row execute function public.training_set_updated_at();

drop trigger if exists training_bookings_updated_at on public.training_bookings;
create trigger training_bookings_updated_at before update on public.training_bookings
for each row execute function public.training_set_updated_at();

drop trigger if exists training_credits_updated_at on public.training_credits;
create trigger training_credits_updated_at before update on public.training_credits
for each row execute function public.training_set_updated_at();

drop trigger if exists training_waitlist_entries_updated_at on public.training_waitlist_entries;
create trigger training_waitlist_entries_updated_at before update on public.training_waitlist_entries
for each row execute function public.training_set_updated_at();

drop trigger if exists training_horse_assignments_updated_at on public.training_horse_assignments;
create trigger training_horse_assignments_updated_at before update on public.training_horse_assignments
for each row execute function public.training_set_updated_at();

alter table public.training_levels enable row level security;
alter table public.training_policies enable row level security;
alter table public.rider_contacts enable row level security;
alter table public.riders enable row level security;
alter table public.rider_contact_links enable row level security;
alter table public.rider_contracts enable row level security;
alter table public.rider_contract_members enable row level security;
alter table public.rider_contract_terms enable row level security;
alter table public.training_groups enable row level security;
alter table public.training_group_levels enable row level security;
alter table public.training_group_slots enable row level security;
alter table public.training_group_memberships enable row level security;
alter table public.training_sessions enable row level security;
alter table public.training_bookings enable row level security;
alter table public.training_credits enable row level security;
alter table public.training_waitlist_entries enable row level security;
alter table public.training_waitlist_offers enable row level security;
alter table public.training_horse_assignments enable row level security;
alter table public.horse_aliases enable row level security;
alter table public.rider_horse_history_summary enable row level security;
alter table public.training_notifications enable row level security;
alter table public.training_audit_log enable row level security;

comment on table public.rider_horse_history_summary is
  'Historical assignment counts are evidence of past pairings, not automatic suitability approval.';

comment on table public.training_group_memberships is
  'Excel-derived memberships start as suggested and must be confirmed by an administrator or trainer.';
