import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pool } from "@/lib/db";

export async function requireAdmin(next = "/admin") {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);

  const res = await pool.query(
    `select 1
     from public.admin_users
     where user_id = $1
       and is_active = true
     limit 1;`,
    [user.id]
  );

  if ((res.rowCount ?? 0) === 0) {
    redirect("/");
  }

  return user;
}