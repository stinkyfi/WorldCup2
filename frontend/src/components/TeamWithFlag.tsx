import { teamKeyToIso2, teamKeyToName, teamNameToIso2 } from "@/lib/teamDisplay";
import { cn } from "@/lib/utils";

function FlagIcon({ iso2, className }: { iso2: string; className?: string }) {
  const code = iso2.trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(code)) return null;
  // `flag-icons` uses .fi.fi-xx classes and sets a background-image SVG.
  return (
    <span
      className={cn("fi inline-block h-[0.9em] w-[1.2em] rounded-[2px] align-[-0.15em]", `fi-${code}`, className)}
      aria-hidden="true"
    />
  );
}

export function TeamNameWithFlag(props: { teamName: string; className?: string; flagClassName?: string }) {
  const { teamName, className, flagClassName } = props;
  const iso2 = teamNameToIso2(teamName);
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {iso2 ? <FlagIcon iso2={iso2} className={flagClassName} /> : null}
      <span>{teamName}</span>
    </span>
  );
}

export function TeamKeyWithFlag(props: { teamKey: string; className?: string; flagClassName?: string }) {
  const { teamKey, className, flagClassName } = props;
  const name = teamKeyToName(teamKey) ?? teamKey;
  const iso2 = teamKeyToIso2(teamKey);
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {iso2 ? <FlagIcon iso2={iso2} className={flagClassName} /> : null}
      <span>{name}</span>
    </span>
  );
}

