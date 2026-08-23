import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getPublishedStableMap } from "@/lib/stable-map";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sisselogimine on vajalik" }, { status: 401 });
  return NextResponse.json(await getPublishedStableMap(), {
    headers: { "Cache-Control": "no-store" },
  });
}
