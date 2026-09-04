import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and start Postgres with `docker compose up -d`.",
  );
}

// Next.js dev hot-reload re-evaluates modules; cache the client on globalThis so
// we do not open a new connection pool on every reload.
const globalForDb = globalThis as unknown as {
  pinBoardSql?: ReturnType<typeof postgres>;
};

const sql = globalForDb.pinBoardSql ?? postgres(connectionString);

if (process.env.NODE_ENV !== "production") {
  globalForDb.pinBoardSql = sql;
}

export const db = drizzle(sql, { schema });
