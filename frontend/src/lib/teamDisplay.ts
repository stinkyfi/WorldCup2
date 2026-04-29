import { WORLD_CUP_GROUPS } from "@/lib/worldCupGroups";

const TEAM_NAME_BY_KEY = new Map<string, string>(
  WORLD_CUP_GROUPS.flatMap((g) => g.teams.map((t) => [t.id.toUpperCase(), t.name] as const)),
);

// Team names here must match `WORLD_CUP_GROUPS` exactly (including diacritics).
const ISO2_BY_TEAM_NAME: Record<string, string> = {
  Mexico: "MX",
  "South Africa": "ZA",
  "Korea Republic": "KR",
  Czechia: "CZ",

  Canada: "CA",
  "Bosnia-Herzegovina": "BA",
  Qatar: "QA",
  Switzerland: "CH",

  Brazil: "BR",
  Morocco: "MA",
  Haiti: "HT",
  Scotland: "GB", // flag for Scotland uses GB in standard emoji flags

  USA: "US",
  Paraguay: "PY",
  Australia: "AU",
  Türkiye: "TR",

  Germany: "DE",
  Curaçao: "CW",
  "Côte d'Ivoire": "CI",
  Ecuador: "EC",

  Netherlands: "NL",
  Japan: "JP",
  Sweden: "SE",
  Tunisia: "TN",

  Belgium: "BE",
  Egypt: "EG",
  "IR Iran": "IR",
  "New Zealand": "NZ",

  Spain: "ES",
  "Cabo Verde": "CV",
  "Saudi Arabia": "SA",
  Uruguay: "UY",

  France: "FR",
  Senegal: "SN",
  Iraq: "IQ",
  Norway: "NO",

  Argentina: "AR",
  Algeria: "DZ",
  Austria: "AT",
  Jordan: "JO",

  Portugal: "PT",
  "Congo DR": "CD",
  Uzbekistan: "UZ",
  Colombia: "CO",

  England: "GB", // emoji flags are ISO country codes; England's is not universally supported
  Croatia: "HR",
  Ghana: "GH",
  Panama: "PA",
};

export function teamKeyToName(teamKey: string): string | null {
  return TEAM_NAME_BY_KEY.get(teamKey.trim().toUpperCase()) ?? null;
}

export function teamNameToIso2(teamName: string): string | null {
  return ISO2_BY_TEAM_NAME[teamName] ?? null;
}

export function teamKeyToIso2(teamKey: string): string | null {
  const name = teamKeyToName(teamKey);
  if (!name) return null;
  return teamNameToIso2(name);
}

export function formatTeamNamePlain(teamName: string): string {
  return teamName;
}

export function formatTeamKeyPlain(teamKey: string): string {
  return teamKeyToName(teamKey) ?? teamKey;
}

