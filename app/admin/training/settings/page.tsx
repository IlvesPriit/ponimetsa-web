import { pool } from "@/lib/db";
import { AdminFeedback } from "@/components/training/AdminFeedback";
import { AdminPageHeader } from "@/components/training/AdminPageHeader";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { updatePolicy } from "../actions";

type Policy = {
  default_group_capacity: number; waitlist_capacity: number; credit_cutoff_time: string;
  credit_expiry_months_after_session: number; offer_hours_same_day: number; offer_hours_previous_day: number;
  offer_hours_earlier: number; no_new_offer_minutes_before: number; registration_minutes_before: number;
  customer_notifications_enabled: boolean;
};

export default async function TrainingSettingsPage({ searchParams }: { searchParams?: Promise<{ saved?: string }> }) {
  const params = (await searchParams) ?? {};
  const policyRes = await pool.query<Policy>(`select * from public.training_policies where id = 'main'`);
  const policy = policyRes.rows[0];
  if (!policy) return <p>Treeningute reegleid ei leitud.</p>;

  return <>
    <AdminPageHeader eyebrow="Süsteemi reeglid" title="Seaded" description="Need reeglid juhivad kohtade arvu, krediite, ootenimekirja ja kutsete kehtivust. Muudatus rakendub kohe järgmistele toimingutele." />
    <AdminFeedback message={params.saved} />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form action={updatePolicy} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7"><input type="hidden" name="return_to" value="/admin/training/settings" />
        <section><h2 className="text-xl font-semibold">Grupid ja registreerimine</h2><p className="mt-1 text-sm text-stone-500">Vaikeväärtused uutele gruppidele ja hilise registreerimise piir.</p><div className="mt-5 grid gap-4 sm:grid-cols-3"><Field label="Grupi vaikemaht" name="default_group_capacity" value={policy.default_group_capacity} /><Field label="Ootenimekirja maht" name="waitlist_capacity" value={policy.waitlist_capacity} min={0} /><Field label="Registreerimine suletakse (min enne)" name="registration_minutes_before" value={policy.registration_minutes_before} min={0} /></div></section>
        <section className="mt-8 border-t border-stone-200 pt-7"><h2 className="text-xl font-semibold">Krediit</h2><p className="mt-1 text-sm text-stone-500">Õigeaegne tühistamine annab järeletegemise krediidi järgmise kuu lõpuni.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-stone-600">Tühistamise tähtaeg eelmisel päeval<input name="credit_cutoff_time" type="time" defaultValue={String(policy.credit_cutoff_time).slice(0, 5)} className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" /></label><Field label="Kehtivus kuid pärast trennikuud" name="credit_expiry_months_after_session" value={policy.credit_expiry_months_after_session} min={0} /></div></section>
        <section className="mt-8 border-t border-stone-200 pt-7"><h2 className="text-xl font-semibold">Ootenimekirja pakkumised</h2><p className="mt-1 text-sm text-stone-500">Kui koht vabaneb, saab esimene ootaja kinnitamiseks piiratud aja.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Samal päeval (h)" name="offer_hours_same_day" value={policy.offer_hours_same_day} /><Field label="Eelmisel päeval (h)" name="offer_hours_previous_day" value={policy.offer_hours_previous_day} /><Field label="Varem (h)" name="offer_hours_earlier" value={policy.offer_hours_earlier} /><Field label="Uusi kutseid ei saadeta (min enne)" name="no_new_offer_minutes_before" value={policy.no_new_offer_minutes_before} min={0} /></div></section>
        <div className="mt-8 flex justify-end border-t border-stone-200 pt-5"><SubmitButton pendingLabel="Salvestan…" className="rounded-xl bg-green-900 px-6 py-3 text-sm font-semibold text-white shadow-sm">Salvesta reeglid</SubmitButton></div>
      </form>

      <aside className="space-y-5"><div className={`rounded-3xl border p-5 shadow-sm ${policy.customer_notifications_enabled ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}><p className="text-xs font-bold uppercase tracking-wider">Klienditeavitused</p><div className="mt-3 flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${policy.customer_notifications_enabled ? "bg-green-600" : "bg-amber-500"}`} /><strong className="text-xl">{policy.customer_notifications_enabled ? "Sisse lülitatud" : "Testimise ajaks väljas"}</strong></div><p className="mt-3 text-sm leading-6 opacity-75">{policy.customer_notifications_enabled ? "Süsteem võib lisada kliendile saatmiseks teavitusi." : "Trennide, aegade ja hobuste muutmine ei saada praegu klientidele automaatseid kirju ega sõnumeid."}</p></div>
        <div className="rounded-3xl border border-stone-200 bg-[#ebe8df] p-5"><h3 className="font-semibold">Kehtivad põhimõtted</h3><ul className="mt-3 space-y-3 text-sm leading-5 text-stone-600"><li>• Osalemise võib igal ajal tühistada; krediidi saamine sõltub tähtajast.</li><li>• Vaba koht ei taga hobuse sobivust—hilise liitumise kinnitab treener.</li><li>• Admin ja treener saavad teha erandeid.</li><li>• Ühe krediidi kasutamine tühistab sama krediidi teised taotlused.</li></ul></div>
      </aside>
    </div>
  </>;
}

function Field({ label, name, value, min = 1 }: { label: string; name: string; value: number; min?: number }) {
  return <label className="text-xs font-semibold text-stone-600">{label}<input name={name} type="number" min={min} defaultValue={value} className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>;
}
