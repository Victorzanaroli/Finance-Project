import type { Config } from "drizzle-kit";

export default {
  schema: "./src/infra/db/schema.ts",
  out: "./src/infra/db/migrations",
  dialect: "sqlite",
  driver: "expo",
} satisfies Config;
