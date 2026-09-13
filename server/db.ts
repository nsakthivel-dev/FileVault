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
} else {
  // Graceful fallback for Firestore-first architecture
  console.log("Running in Cloud Firestore architecture mode (DATABASE_URL not set).");
}