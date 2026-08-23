import { createClient } from "@/lib/supabase/server";
import { pool } from "@/lib/db";

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function getAdminApiUser() {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  const result = await pool.query(
    `select 1 from public.admin_users where user_id = $1 and is_active = true limit 1`,
    [user.id],
  );
  return result.rowCount ? user : null;
}
