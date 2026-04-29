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

export const WORLD_CUP_GROUPS: GroupDefinition[] = ([
  {
    id: "A",
    label: "Group A",
    teams: [
      { id: "A1", name: "Mexico" },
      { id: "A2", name: "South Africa" },
      { id: "A3", name: "Korea Republic" },
      { id: "A4", name: "Czechia" },
    ],
  },
  {
    id: "B",
    label: "Group B",
    teams: [
      { id: "B1", name: "Canada" },
      { id: "B2", name: "Bosnia-Herzegovina" },
      { id: "B3", name: "Qatar" },
      { id: "B4", name: "Switzerland" },
    ],
  },
  {
    id: "C",
    label: "Group C",
    teams: [
      { id: "C1", name: "Brazil" },
      { id: "C2", name: "Morocco" },
      { id: "C3", name: "Haiti" },
      { id: "C4", name: "Scotland" },
    ],
  },
  {
    id: "D",
    label: "Group D",
    teams: [
      { id: "D1", name: "USA" },
      { id: "D2", name: "Paraguay" },
      { id: "D3", name: "Australia" },
      { id: "D4", name: "Türkiye" },
    ],
  },
  {
    id: "E",
    label: "Group E",
    teams: [
      { id: "E1", name: "Germany" },
      { id: "E2", name: "Curaçao" },
      { id: "E3", name: "Côte d'Ivoire" },
      { id: "E4", name: "Ecuador" },
    ],
  },
  {
    id: "F",
    label: "Group F",
    teams: [
      { id: "F1", name: "Netherlands" },
      { id: "F2", name: "Japan" },
      { id: "F3", name: "Sweden" },
      { id: "F4", name: "Tunisia" },
    ],
  },
  {
    id: "G",
    label: "Group G",
    teams: [
      { id: "G1", name: "Belgium" },
      { id: "G2", name: "Egypt" },
      { id: "G3", name: "IR Iran" },
      { id: "G4", name: "New Zealand" },
    ],
  },
  {
    id: "H",
    label: "Group H",
    teams: [
      { id: "H1", name: "Spain" },
      { id: "H2", name: "Cabo Verde" },
      { id: "H3", name: "Saudi Arabia" },
      { id: "H4", name: "Uruguay" },
    ],
  },
  {
    id: "I",
    label: "Group I",
    teams: [
      { id: "I1", name: "France" },
      { id: "I2", name: "Senegal" },
      { id: "I3", name: "Iraq" },
      { id: "I4", name: "Norway" },
    ],
  },
  {
    id: "J",
    label: "Group J",
    teams: [
      { id: "J1", name: "Argentina" },
      { id: "J2", name: "Algeria" },
      { id: "J3", name: "Austria" },
      { id: "J4", name: "Jordan" },
    ],
  },
  {
    id: "K",
    label: "Group K",
    teams: [
      { id: "K1", name: "Portugal" },
      { id: "K2", name: "Congo DR" },
      { id: "K3", name: "Uzbekistan" },
      { id: "K4", name: "Colombia" },
    ],
  },
  {
    id: "L",
    label: "Group L",
    teams: [
      { id: "L1", name: "England" },
      { id: "L2", name: "Croatia" },
      { id: "L3", name: "Ghana" },
      { id: "L4", name: "Panama" },
    ],
  },
] as const) satisfies GroupDefinition[];

