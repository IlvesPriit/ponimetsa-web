import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../lib/supabase/server";

type Props = {
  searchParams?: { next?: string };
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = params?.next ?? "/admin";

  async function signIn(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Lihtne MVP: viskame errori (Next näitab)
      throw new Error(error.message);
    }

    redirect(next);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-semibold">Admin login</h1>
      <p className="mt-2 text-gray-700">
        Sisselogimine on vajalik, et hallata broneeringuid ja vabu aegu.
      </p>

      <form action={signIn} className="mt-8 space-y-4">
        <div>
          <label className="text-sm font-medium">E-post</label>
          <input
            name="email"
            type="email"
            className="mt-1 w-full rounded-xl border px-4 py-3"
            required
          />
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

        <button className="w-full rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:opacity-90">
          Logi sisse
        </button>
      </form>

      <div className="mt-6 text-sm text-gray-600">
        <Link href="/" className="underline">Tagasi avalehele</Link>
      </div>
    </div>
  );
}