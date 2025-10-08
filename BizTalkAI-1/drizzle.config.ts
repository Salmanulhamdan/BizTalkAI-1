import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.DB_HOST || 'billsphere.com',
    user: process.env.DB_USER || 'dulto726fxeg',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'csvfiles',
    port: parseInt(process.env.DB_PORT || '3306'),
  },
});
