/** API origin for fetch (empty = same-origin, works with Vite `/api` → backend proxy in dev). */
export function apiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw === "string" && raw.trim() !== "") {
    return raw.replace(/\/$/, "");
  }
  return "";
}

export function apiUrl(path: string): string {
  const base = apiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
