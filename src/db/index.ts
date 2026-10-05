import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { campusFindPool?: Pool };

export function createPool(url: string) {
  return new Pool({ connectionString: url, max: 10 });
}

function getPool() {
  if (!globalForDb.campusFindPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalForDb.campusFindPool = createPool(url);
  }
  return globalForDb.campusFindPool;
}

export function makeDb(pool: Pool): DB {
  return drizzle(pool, { schema });
}

let cached: DB | undefined;
export function db(): DB {
  if (!cached) cached = makeDb(getPool());
  return cached;
}

export async function pingDb() {
  await getPool().query("select 1");
}
