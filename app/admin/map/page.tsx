import MapEditor from "@/components/stable-map/MapEditor";
import { requireAdmin } from "@/lib/admin";
import { getStableMapBundle } from "@/lib/stable-map";

export const dynamic = "force-dynamic";

export default async function StableMapAdminPage() {
  await requireAdmin("/admin/map");
  const bundle = await getStableMapBundle();
  return <MapEditor initialMap={bundle.draft} horses={bundle.horses} publishedAt={bundle.publishedAt} />;
}
