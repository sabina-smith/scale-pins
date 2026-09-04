import { defineConfig } from "drizzle-kit";

// drizzle-kit reads `.env` from the project root on its own, so the `db:*` npm
// scripts need no --env-file flag and no dotenv dependency.
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
