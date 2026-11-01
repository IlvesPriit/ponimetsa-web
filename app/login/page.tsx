import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { createClient } from "../../lib/supabase/server";
import { pool } from "@/lib/db";
import { SubmitButton } from "@/components/ui/SubmitButton";

type Props = {
  searchParams?: Promise<{ next?: string; error?: string; sent?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const requestedNext = params?.next ?? "/admin";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/admin";
  const loginError = params?.error;
  const magicNext = next.startsWith("/admin") || next.startsWith("/display") ? "/minu-trennid" : next;

  async function sendMagicLink(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!email) redirect(`/login?next=${encodeURIComponent(magicNext)}&error=email`);

    const knownContact = await pool.query(
      `select 1 from public.rider_contacts where active = true and lower(email) = lower($1) limit 1`,
      [email]
    );

    if ((knownContact.rowCount ?? 0) > 0) {
      const requestHeaders = await headers();
      const origin = process.env.NEXT_PUBLIC_SITE_URL || requestHeaders.get("origin") || "https://ponimetsa.ee";
      const callback = new URL("/auth/callback", origin);
      callback.searchParams.set("next", magicNext);

      const supabase = await createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callback.toString(),
          shouldCreateUser: true,
        },
      });
      if (error) redirect(`/login?next=${encodeURIComponent(magicNext)}&error=auth`);
    }

    // Sama vastus ka tundmatu aadressi puhul, et kontaktide nimekirja ei saaks tuvastada.
    redirect(`/login?next=${encodeURIComponent(magicNext)}&sent=1`);
  }

  async function signIn(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const reason = error.code === "invalid_credentials" ? "credentials" : "auth";
      redirect(`/login?next=${encodeURIComponent(next)}&error=${reason}`);
    }

    redirect(next);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-semibold">Logi sisse</h1>
      <p className="mt-2 text-gray-700">
        Lapsevanemad ja ratsanikud saavad turvalise ühekordse sisselogimislingi e-postile.
      </p>

      {params?.sent === "1" && (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900" role="status">
          Kui see e-post on Ponimetsa kontaktides, saatsime sellele sisselogimislingi. Kontrolli ka rämpsposti kausta.
        </div>
      )}

      {loginError ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {loginError === "credentials"
            ? "E-post või parool ei ole õige. Kontrolli sisestust ja proovi uuesti."
            : loginError === "link"
              ? "Sisselogimislink on vigane või aegunud. Palun küsi uus link."
              : loginError === "email"
                ? "Sisesta korrektne e-posti aadress."
            : "Sisselogimine ebaõnnestus. Palun proovi mõne hetke pärast uuesti."}
        </div>
      ) : null}

      <form action={sendMagicLink} className="mt-8 space-y-4 rounded-2xl border p-5">
        <div>
          <label className="text-sm font-medium">E-post</label>
          <input
            name="email"
            type="email"
            className="mt-1 w-full rounded-xl border px-4 py-3"
            required
          />
        </div>

        <SubmitButton pendingLabel="Saadan linki…" className="w-full rounded-xl bg-green-800 px-5 py-3 text-sm font-medium text-white hover:opacity-90">
          Saada ühekordne sisselogimislink
        </SubmitButton>
      </form>

      <div className="my-8 flex items-center gap-3 text-xs uppercase tracking-wide text-gray-400"><span className="h-px flex-1 bg-gray-200" />Administraator<span className="h-px flex-1 bg-gray-200" /></div>

      <form action={signIn} className="space-y-4 rounded-2xl border p-5">
        <p className="text-sm text-gray-600">Administraatori olemasolev parooliga sisselogimine.</p>
        <div>
          <label className="text-sm font-medium">Administraatori e-post</label>
          <input name="email" type="email" className="mt-1 w-full rounded-xl border px-4 py-3" required />
        </div>

        <div>
          <label className="text-sm font-medium">Parool</label>
          <input
            name="password"
            type="password"
            className="mt-1 w-full rounded-xl border px-4 py-3"
            required
          />
        </div>

        <SubmitButton pendingLabel="Login sisse…" className="w-full rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:opacity-90">
          Logi sisse
        </SubmitButton>
      </form>

      <div className="mt-6 text-sm text-gray-600">
        <Link href="/" className="underline">Tagasi avalehele</Link>
      </div>
    </div>
  );
}
