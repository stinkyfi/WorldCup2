export type WorldCupGroupId =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L";

export type GroupTeam = {
  id: string;
  name: string;
};

export type GroupDefinition = {
  id: WorldCupGroupId;
  label: string;
  teams: [GroupTeam, GroupTeam, GroupTeam, GroupTeam];
};

// Placeholder team names until official tournament data source is wired.
function t(groupId: WorldCupGroupId, n: 1 | 2 | 3 | 4): GroupTeam {
  return { id: `${groupId}${n}`, name: `Team ${groupId}${n}` };
}

export const WORLD_CUP_GROUPS: GroupDefinition[] = ([
  { id: "A", label: "Group A", teams: [t("A", 1), t("A", 2), t("A", 3), t("A", 4)] },
  { id: "B", label: "Group B", teams: [t("B", 1), t("B", 2), t("B", 3), t("B", 4)] },
  { id: "C", label: "Group C", teams: [t("C", 1), t("C", 2), t("C", 3), t("C", 4)] },
  { id: "D", label: "Group D", teams: [t("D", 1), t("D", 2), t("D", 3), t("D", 4)] },
  { id: "E", label: "Group E", teams: [t("E", 1), t("E", 2), t("E", 3), t("E", 4)] },
  { id: "F", label: "Group F", teams: [t("F", 1), t("F", 2), t("F", 3), t("F", 4)] },
  { id: "G", label: "Group G", teams: [t("G", 1), t("G", 2), t("G", 3), t("G", 4)] },
  { id: "H", label: "Group H", teams: [t("H", 1), t("H", 2), t("H", 3), t("H", 4)] },
  { id: "I", label: "Group I", teams: [t("I", 1), t("I", 2), t("I", 3), t("I", 4)] },
  { id: "J", label: "Group J", teams: [t("J", 1), t("J", 2), t("J", 3), t("J", 4)] },
  { id: "K", label: "Group K", teams: [t("K", 1), t("K", 2), t("K", 3), t("K", 4)] },
  { id: "L", label: "Group L", teams: [t("L", 1), t("L", 2), t("L", 3), t("L", 4)] },
] as const) satisfies GroupDefinition[];

