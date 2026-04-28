import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (v === undefined || v.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function commaList(name: string, fallback: string): string[] {
  const raw = process.env[name];
  const s = raw && raw.trim() !== "" ? raw.trim() : fallback;
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

function intList(name: string, fallback: string): number[] {
  return commaList(name, fallback).map((x) => Number(x)).filter((n) => Number.isFinite(n));
}

const weekMs = 7 * 24 * 60 * 60 * 1000;

export const config = {
  /** HTTP listen port (default 3001 per Story 1.8) */
  port: Number(process.env.API_PORT ?? "3001") || 3001,
  databaseUrl: required("DATABASE_URL"),
  /** SIWE `domain` values accepted from the client message (hostnames, no scheme). */
  get siweAllowedDomains(): string[] {
    return commaList("SIWE_ALLOWED_DOMAINS", "localhost:5173,127.0.0.1:5173");
  },
  /** Chain IDs allowed in SIWE messages and session chain updates (default: Base Sepolia). */
  get siweAllowedChainIds(): number[] {
    return intList("SIWE_ALLOWED_CHAIN_IDS", "84532");
  },
  /** Session lifetime for HTTP-only cookie sessions. */
  sessionMaxAgeMs: Math.max(60_000, Number(process.env.SESSION_MAX_AGE_MS ?? String(weekMs)) || weekMs),
  /** Browser origins allowed for credentialed CORS (comma-separated). */
  corsOrigins: commaList(
    "CORS_ORIGIN",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
  ),
  /** Set `Secure` on session cookie (required in production behind HTTPS). */
  cookieSecure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
};
