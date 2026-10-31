import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { findContactForAuthUser, loadPortalForContact } from "@/lib/training-portal";
import { TrainingPortalView } from "@/components/training/TrainingPortalView";

export default async function MyTrainingPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/minu-trennid");

  const contact = await findContactForAuthUser(data.user.id, data.user.email ?? null);
  if (!contact) {
    return (
      <TrainingPortalView
        data={{
          viewerName: data.user.email ?? "kasutaja",
          viewerEmail: data.user.email ?? null,
          perspective: "contact",
          riders: [],
          memberships: [],
          bookings: [],
          credits: [],
          waitlist: [],
        }}
      />
    );
  }

  const portal = await loadPortalForContact(contact.id);
  if (!portal) redirect("/");
  return <TrainingPortalView data={portal} />;
}
