export type WorldCupGroupLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L";

export function groupLetterFromId(groupId: number): WorldCupGroupLetter | null {
  const letters = "ABCDEFGHIJKL";
  if (!Number.isFinite(groupId) || groupId < 0 || groupId >= letters.length) return null;
  return letters[groupId] as WorldCupGroupLetter;
}

export function teamKeysForGroupLetter(letter: WorldCupGroupLetter): [string, string, string, string] {
  return [`${letter}1`, `${letter}2`, `${letter}3`, `${letter}4`];
}

