create table if not exists public.horses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stable_maps (
  id text primary key,
  published_data jsonb not null,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  published_by uuid
);

create table if not exists public.stable_map_drafts (
  map_id text primary key references public.stable_maps(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.stable_map_versions (
  id bigint generated always as identity primary key,
  map_id text not null references public.stable_maps(id) on delete cascade,
  data jsonb not null,
  published_at timestamptz not null default now(),
  published_by uuid
);

create index if not exists stable_map_versions_map_published_idx
  on public.stable_map_versions (map_id, published_at desc);

alter table public.horses enable row level security;
alter table public.stable_maps enable row level security;
alter table public.stable_map_drafts enable row level security;
alter table public.stable_map_versions enable row level security;

drop policy if exists "Authenticated users can view the published stable map" on public.stable_maps;
create policy "Authenticated users can view the published stable map"
  on public.stable_maps for select to authenticated using (true);

insert into public.horses (name)
values
  ('Luna'), ('Aaton'), ('Tamador'), ('Arthug'),
  ('Made You Look'), ('Redy Finn'), ('Laukinuke'), ('Ago')
on conflict (name) do nothing;

insert into public.stable_maps (id, published_data)
values (
  'main',
  '{"schemaVersion":1,"mapId":"main","canvas":{"width":1672,"height":941},"background":{"url":"/images/stable-map.png","alt":"Ponimetsa talli ja koplite kaart"},"objects":[]}'::jsonb
)
on conflict (id) do nothing;

insert into public.stable_map_drafts (map_id, data)
select id, published_data from public.stable_maps where id = 'main'
on conflict (map_id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'stable_maps'
  ) then
    alter publication supabase_realtime add table public.stable_maps;
  end if;
end $$;
