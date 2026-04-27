import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (v === undefined || v.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export const config = {
  /** HTTP listen port (default 3001 per Story 1.8) */
  port: Number(process.env.API_PORT ?? "3001") || 3001,
  databaseUrl: required("DATABASE_URL"),
};
