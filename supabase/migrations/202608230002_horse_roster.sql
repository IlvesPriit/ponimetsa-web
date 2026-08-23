update public.horses
set name = 'Chiaro Diluna',
    active = true,
    updated_at = now()
where lower(name) = 'luna'
  and not exists (
    select 1 from public.horses where lower(name) = lower('Chiaro Diluna')
  );

insert into public.horses (name)
values
  ('Chiaro Diluna'),
  ('Tekiila'),
  ('Dorian'),
  ('Karma'),
  ('Sirlincia RT'),
  ('Morris'),
  ('Deeli'),
  ('Viktooria')
on conflict (name) do update
set active = true,
    updated_at = now();

update public.stable_map_drafts as draft
set data = jsonb_set(
      draft.data,
      '{objects}',
      (
        select coalesce(
          jsonb_agg(
            case
              when object->>'type' = 'horse' and lower(object->>'name') = 'luna'
                then jsonb_set(object, '{name}', to_jsonb('Chiaro Diluna'::text))
              else object
            end
            order by position
          ),
          '[]'::jsonb
        )
        from jsonb_array_elements(draft.data->'objects') with ordinality as items(object, position)
      ),
      false
    ),
    updated_at = now()
where exists (
  select 1
  from jsonb_array_elements(draft.data->'objects') as items(object)
  where object->>'type' = 'horse' and lower(object->>'name') = 'luna'
);

update public.stable_maps as map
set published_data = jsonb_set(
      map.published_data,
      '{objects}',
      (
        select coalesce(
          jsonb_agg(
            case
              when object->>'type' = 'horse' and lower(object->>'name') = 'luna'
                then jsonb_set(object, '{name}', to_jsonb('Chiaro Diluna'::text))
              else object
            end
            order by position
          ),
          '[]'::jsonb
        )
        from jsonb_array_elements(map.published_data->'objects') with ordinality as items(object, position)
      ),
      false
    ),
    updated_at = now()
where exists (
  select 1
  from jsonb_array_elements(map.published_data->'objects') as items(object)
  where object->>'type' = 'horse' and lower(object->>'name') = 'luna'
);
