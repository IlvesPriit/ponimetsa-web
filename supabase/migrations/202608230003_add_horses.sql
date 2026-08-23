insert into public.horses (name)
values
  ('Noora'),
  ('Leelo'),
  ('Krahvinna')
on conflict (name) do update
set active = true,
    updated_at = now();
