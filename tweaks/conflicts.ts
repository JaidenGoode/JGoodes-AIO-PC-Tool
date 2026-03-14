// Maps a tweak title to the title of the tweak it conflicts with.
// Conflicts mean: both being active simultaneously causes redundancy or
// functional interference (e.g. writing to the same registry key).

export const TWEAK_CONFLICTS: Record<string, string> = {
  // IPv6 tweaks write to the same DisabledComponents registry key with
  // different values — 255 (full disable) vs 32 (prefer IPv4). Enabling
  // both results in one overwriting the other.
  "Disable IPv6":           "Prefer IPv4 over IPv6",
  "Prefer IPv4 over IPv6":  "Disable IPv6",

  // Game Mode depends on Xbox infrastructure. Disabling Xbox Core Services
  // while Game Mode is on may cause Game Mode to silently fail.
  "Enable Game Mode":             "Disable Xbox Core Services",
  "Disable Xbox Core Services":   "Enable Game Mode",

  // Boot Configuration enables Prefetcher/SuperFetch (value 3), which conflicts
  // with disabling the SysMain service that implements them.
  "Disable SuperFetch / SysMain":  "Optimize Boot Configuration",
  "Optimize Boot Configuration":   "Disable SuperFetch / SysMain",
};

export function getConflict(title: string): string | null {
  return TWEAK_CONFLICTS[title] ?? null;
}
