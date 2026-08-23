import { pool } from "@/lib/db";
import {
  DEFAULT_HORSES,
  EMPTY_STABLE_MAP,
  parseStableMapDocument,
  type Horse,
  type StableMapDocument,
} from "@/types/stable-map";

export type StableMapBundle = {
  draft: StableMapDocument;
  published: StableMapDocument;
  publishedAt: string | null;
  horses: Horse[];
};

export async function getStableMapBundle(): Promise<StableMapBundle> {
  const [mapResult, draftResult, horseResult] = await Promise.all([
    pool.query(
      `select published_data, published_at from public.stable_maps where id = 'main' limit 1`,
    ),
    pool.query(
      `select data from public.stable_map_drafts where map_id = 'main' limit 1`,
    ),
    pool.query(
      `select id::text, name from public.horses where active = true order by name asc`,
    ),
  ]);

  const publishedRaw = mapResult.rows[0]?.published_data ?? EMPTY_STABLE_MAP;
  const draftRaw = draftResult.rows[0]?.data ?? publishedRaw;
  const horses = horseResult.rows.length
    ? (horseResult.rows as Horse[])
    : DEFAULT_HORSES;

  return {
    draft: parseStableMapDocument(draftRaw),
    published: parseStableMapDocument(publishedRaw),
    publishedAt: mapResult.rows[0]?.published_at?.toISOString?.() ?? null,
    horses,
  };
}

export async function getPublishedStableMap(): Promise<{
  map: StableMapDocument;
  publishedAt: string | null;
}> {
  const result = await pool.query(
    `select published_data, published_at from public.stable_maps where id = 'main' limit 1`,
  );
  return {
    map: parseStableMapDocument(result.rows[0]?.published_data ?? EMPTY_STABLE_MAP),
    publishedAt: result.rows[0]?.published_at?.toISOString?.() ?? null,
  };
}

export async function saveStableMap(
  map: StableMapDocument,
  userId: string,
  publish: boolean,
) {
  const document = parseStableMapDocument(map);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into public.stable_map_drafts (map_id, data, updated_at, updated_by)
       values ('main', $1::jsonb, now(), $2::uuid)
       on conflict (map_id) do update
       set data = excluded.data, updated_at = now(), updated_by = excluded.updated_by`,
      [JSON.stringify(document), userId],
    );

    let publishedAt: string | null = null;
    if (publish) {
      const published = await client.query(
        `insert into public.stable_maps (id, published_data, published_at, updated_at, published_by)
         values ('main', $1::jsonb, now(), now(), $2::uuid)
         on conflict (id) do update
         set published_data = excluded.published_data,
             published_at = now(),
             updated_at = now(),
             published_by = excluded.published_by
         returning published_at`,
        [JSON.stringify(document), userId],
      );
      publishedAt = published.rows[0].published_at.toISOString();
      await client.query(
        `insert into public.stable_map_versions (map_id, data, published_by)
         values ('main', $1::jsonb, $2::uuid)`,
        [JSON.stringify(document), userId],
      );
    }

    await client.query("commit");
    return { publishedAt };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
