import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pool } from "@/lib/db";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next") ?? "/minu-trennid";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/minu-trennid";

  if (!code) return NextResponse.redirect(new URL("/login?error=link", request.url));

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=link", request.url));

  const { data } = await supabase.auth.getUser();
  if (data.user?.email) {
    await pool.query(
      `update public.rider_contacts
       set auth_user_id = $1
       where lower(email) = lower($2)
         and (auth_user_id is null or auth_user_id = $1)`,
      [data.user.id, data.user.email]
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
