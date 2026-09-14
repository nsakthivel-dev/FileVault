import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

export let pool: pg.Pool | null = null;
export let db: any = null;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
    console.log("PostgreSQL connection initialized via DATABASE_URL");
  } catch (err) {
    console.warn("Could not connect to PostgreSQL database:", err);
  }
} else if (process.env.SUPABASE_URL) {
  console.log("Running in Supabase Cloud architecture mode (Storage & Auth powered by Supabase).");
} else {
  console.log("Running in Local / Standalone mode.");
}