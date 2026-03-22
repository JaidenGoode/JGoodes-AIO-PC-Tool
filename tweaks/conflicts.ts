// Maps a tweak title to the title of the tweak it conflicts with.
// Conflicts mean: both being active simultaneously causes redundancy or
// functional interference (e.g. writing to the same registry key).

export const TWEAK_CONFLICTS: Record<string, string> = {
  // Game Mode depends on Xbox infrastructure. Disabling Xbox Core Services
  // while Game Mode is on may cause Game Mode to silently fail.
  "Enable Game Mode":             "Disable Xbox Core Services",
  "Disable Xbox Core Services":   "Enable Game Mode",

  // Optimize Boot Configuration sets HiberbootEnabled=1 (fast startup on).
  // Disable Hibernation sets HiberbootEnabled=0 (fast startup off).
  // Enabling both simultaneously results in one overwriting the other.
  "Optimize Boot Configuration":   "Disable Hibernation",
  "Disable Hibernation":           "Optimize Boot Configuration",

  // Optimize Boot Configuration now also sets Compression=0.
  // Disable Memory Compression writes the same key — redundant if both are active.
  "Disable Memory Compression":    "Optimize Boot Configuration",

};

export function getConflict(title: string): string | null {
  return TWEAK_CONFLICTS[title] ?? null;
}
