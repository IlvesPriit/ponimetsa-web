import { NextResponse } from "next/server";
import { getAdminApiUser } from "@/lib/api-auth";
import { getStableMapBundle, saveStableMap } from "@/lib/stable-map";
import { parseStableMapDocument } from "@/types/stable-map";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAdminApiUser();
  if (!user) return NextResponse.json({ error: "Ligipääs puudub" }, { status: 401 });
  return NextResponse.json(await getStableMapBundle());
}

export async function POST(request: Request) {
  const user = await getAdminApiUser();
  if (!user) return NextResponse.json({ error: "Ligipääs puudub" }, { status: 401 });

  try {
    const body = await request.json();
    if (body.action !== "save" && body.action !== "publish") {
      return NextResponse.json({ error: "Tundmatu tegevus" }, { status: 400 });
    }
    const map = parseStableMapDocument(body.map);
    const result = await saveStableMap(map, user.id, body.action === "publish");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Stable map save failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kaardi salvestamine ebaõnnestus" },
      { status: 400 },
    );
  }
}
