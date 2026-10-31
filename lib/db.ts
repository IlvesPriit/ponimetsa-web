import { Pool } from "pg";
import { assertDatabaseMatchesSupabaseProject } from "@/lib/supabase/config";

declare global {
  var __pgPool: Pool | undefined;
}

function getPool() {
  if (global.__pgPool) return global.__pgPool;

  assertDatabaseMatchesSupabaseProject();
  const createdPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Supabase nõuab TLS-i
  });

  if (process.env.NODE_ENV !== "production") global.__pgPool = createdPool;
  return createdPool;
}

// Hoiame senise API alles, kuid ühendus luuakse alles esimese päringu ajal.
// Nii saab rakendus anda selge vea enne, kui vale projekti andmeid loetakse.
export const pool = new Proxy({} as Pool, {
  get(_target, property) {
    const activePool = getPool();
    const value = Reflect.get(activePool, property, activePool);
    return typeof value === "function" ? value.bind(activePool) : value;
  },
});
