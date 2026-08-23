import { redirect } from "next/navigation";
import StableDisplay from "@/components/stable-map/StableDisplay";
import { createClient } from "@/lib/supabase/server";
import { getPublishedStableMap } from "@/lib/stable-map";

export const dynamic = "force-dynamic";

export default async function StableDisplayPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/display/stable");
  const published = await getPublishedStableMap();
  return <StableDisplay initialMap={published.map} initialPublishedAt={published.publishedAt} />;
}
