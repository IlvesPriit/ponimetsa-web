const PROD_PROJECT_REF = "mtfrftaadtpjjkklwvpa";

function projectRefFromUrl(value: string) {
  try {
    return new URL(value).hostname.split(".")[0];
  } catch {
    return "";
  }
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const configuredRef = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF;
  const actualRef = projectRefFromUrl(url);

  if (!url || !anonKey) {
    throw new Error("Supabase seadistus on puudulik.");
  }
  if (configuredRef && configuredRef !== PROD_PROJECT_REF) {
    throw new Error(`Vale Supabase projekti tunnus: oodati ${PROD_PROJECT_REF}.`);
  }
  if (actualRef !== PROD_PROJECT_REF) {
    throw new Error(
      `Vale Supabase projekt: oodati ${PROD_PROJECT_REF}, leiti ${actualRef || "tundmatu"}.`
    );
  }

  return { url, anonKey, projectRef: PROD_PROJECT_REF };
}

export function assertDatabaseMatchesSupabaseProject() {
  const { projectRef } = getSupabaseConfig();
  const databaseUrl = process.env.DATABASE_URL ?? "";

  if (!databaseUrl) throw new Error("DATABASE_URL puudub.");

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL ei ole korrektne.");
  }

  const directHostMatches = parsed.hostname === `db.${projectRef}.supabase.co`;
  const poolerUserMatches = decodeURIComponent(parsed.username).endsWith(`.${projectRef}`);

  if (!directHostMatches && !poolerUserMatches) {
    throw new Error(`DATABASE_URL ei kuulu projektile ${projectRef}.`);
  }
}
