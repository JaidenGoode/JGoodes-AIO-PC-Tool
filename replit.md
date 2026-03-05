# JGoode A.I.O PC Tool

A modern, professional web-based Windows PC optimization tool — a full redesign of the original WPF C# app (GitHub: JaidenGoode/JGoodeA.I.O_PC_Tool).

## Architecture

- **Frontend**: React + Vite + TypeScript + TanStack Query + Wouter routing + Shadcn UI
- **Backend**: Express (TypeScript) serving JSON REST API
- **Storage**: JSON file-based persistence via `JsonStorage` (`~/.jgoode-aio/data.json`) — no database required
- **Theme**: Custom `ThemeProvider` with 13 accent colors + dark/light mode, persisted to localStorage
- **System info**: `systeminformation` npm package used for real-time hardware data

## Key Files

| File | Purpose |
|---|---|
| `client/src/components/theme-provider.tsx` | Theme context: 13 colors, dark/light mode, CSS variable injection (applied synchronously to prevent flash) |
| `client/src/components/layout.tsx` | App shell: sidebar + header with color swatches + bottom status bar |
| `client/src/components/app-sidebar.tsx` | Sidebar: grouped nav (MAIN/NETWORK/SYSTEM); Discord icon uses theme accent |
| `client/src/lib/api.ts` | Web-only API layer (no Tauri dependency) |
| `client/src/lib/tweak-commands.ts` | All 47 real PowerShell commands; `generatePowerShellScript()` exports active tweaks as .ps1 |
| `server/routes.ts` | Express routes + auto-seeds 47 tweaks from `TWEAKS_SEED` on startup |
| `server/storage.ts` | `IStorage` interface → always uses `JsonStorage` |
| `server/storage-json.ts` | JSON file persistence at `~/.jgoode-aio/data.json` |
| `shared/schema.ts` | Drizzle schema + Zod types for Tweaks, Settings |
| `shared/tweaks-seed.ts` | 47 pre-defined Windows optimization tweaks with full descriptions |

## Pages

- `/` — Dashboard: live CPU/RAM/GPU/disk usage bars (theme accent color), hardware info, temp readouts
- `/tweaks` — Tweaks: 47 toggles with real PowerShell commands, Export .ps1 script, View CMD per tweak
- `/cleaner` — Cleaner: Razer Cortex-style Scan→Select→Clean flow
- `/utilities` — Utilities: Windows utility shortcuts
- `/dns` — DNS Manager: switch DNS provider
- `/restore` — Restore Points: create/manage Windows system restore points
- `/settings` — Settings: font size, theme preferences

## Design

- **Primary theme**: Black background with crimson red accent (hue 0)
- **13 accent colors**: Crimson, Inferno, Ember, Gold, Toxic, Matrix, Neon, Ice, Arctic, Void, Ultra, Plasma, Pulse
- **Dark/Light mode**: Toggle in header, persisted to localStorage
- **Color swatches**: Click in header for instant theme switching; theme applies synchronously (no flash)
- **All usage bars**: Match the theme accent color (bg-primary) for CPU, RAM, GPU, Disk
- **Discord icon**: Matches theme accent color

## Tweaks Behavior

- Each tweak has an individual toggle that saves instantly via `PATCH /api/tweaks/:id`
- State persists to `~/.jgoode-aio/data.json`
- 47 tweaks across categories: debloat, privacy, performance, gaming, system, browser
- Real PowerShell commands stored in `tweak-commands.ts` (keyed by tweak title)
- "Export .ps1" button generates a complete Administrator PowerShell script for all active tweaks
- "View CMD" button on each card shows the command in a dialog with copy button
- "Apply All" was intentionally removed — individual save only

## Notes

- GPU usage shows N/A on server (no GPU hardware); works correctly on Windows machines with GPU
- Temperature sensors require admin privileges or hardware support — may show N/A on some systems
- The cleaner scans the server filesystem (Linux/Windows temp directories based on OS)
- All PowerShell commands require Administrator privileges to run on Windows
