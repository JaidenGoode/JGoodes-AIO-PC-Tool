# JGoode A.I.O PC Tool

> **GitHub Push**: Uses `GITHUB_PERSONAL_ACCESS_TOKEN_MARCH5` (falls back to `GITHUB_TOKEN`) — direct GitHub API calls, no OAuth connector needed. Push via the in-app GitHub page or `POST /api/github/push`.

A modern Windows PC optimization desktop app built with Electron + Express + React.

## Architecture

- **Frontend**: React + Vite + TypeScript + TanStack Query + Wouter routing + Shadcn UI
- **Backend**: Express (TypeScript) REST API embedded inside the Electron app
- **Storage**: JSON file-based persistence via `JsonStorage` (`~/.jgoode-aio/data.json`) — no database required
- **Theme**: Custom `ThemeProvider` with 13 accent colors + dark/light mode, persisted to localStorage
- **System info**: `systeminformation` npm package for real-time hardware data
- **Desktop**: Electron wraps the full-stack app; built for Windows via `BUILD_EXE.bat`

## Key Files

| File | Purpose |
|---|---|
| `electron/main.cjs` | Electron main process: starts Express, opens window when server ready |
| `electron/preload.cjs` | Exposes `window.electronAPI` (minimize, maximize, close) |
| `electron-builder.json` | Electron packaging config: `asar:false`, `electronVersion:33.4.11`, NSIS installer |
| `BUILD_EXE.bat` | Run on Windows to build installer via electron-builder |
| `client/src/components/theme-provider.tsx` | Theme context: 13 colors, dark/light mode, CSS variable injection |
| `client/src/components/layout.tsx` | App shell: sidebar + header + status bar |
| `client/src/lib/api.ts` | All API calls (fetch-based, no Tauri) |
| `client/src/lib/tweak-commands.ts` | All 47 real PowerShell enable/disable commands + `generateUndoScript()` |
| `client/src/lib/tweak-presets.ts` | Gaming, Privacy, Performance, Select All preset definitions |
| `client/src/lib/tweak-impacts.ts` | Impact ratings (High/Medium/Low) per tweak |
| `client/src/lib/tweak-conflicts.ts` | Conflict pairs between mutually exclusive tweaks |
| `client/src/components/command-palette.tsx` | Global Ctrl+K command palette (navigate, preset, export) |
| `server/routes.ts` | Express routes + PowerShell execution + auto-seeds 47 tweaks + `POST /api/tweaks/detect` + `POST /api/tweaks/bulk` + cleaning history |
| `server/storage.ts` | `IStorage` interface → always uses `JsonStorage` |
| `server/storage-json.ts` | JSON file persistence at `~/.jgoode-aio/data.json` |
| `shared/schema.ts` | Drizzle schema + Zod types for Tweaks, Settings |
| `shared/tweaks-seed.ts` | 47 pre-defined Windows optimization tweaks |

## Pages

- `/` — Dashboard: System Health Score ring gauge (0-100 with grade A-F); live CPU/RAM/GPU/disk bars, hardware info, temperature readouts, quick restore point button
- `/tweaks` — 47 toggles with PowerShell commands; impact ratings (High/Medium/Low) per card; conflict detection between incompatible tweaks; "View CMD", "Export .ps1", "Undo Script" buttons
- `/cleaner` — Razer Cortex-style Scan → Select → Clean flow (Windows temp, prefetch, browser cache, etc.)
- `/utilities` — Windows tools: SFC, DISM, CheckDisk (opens terminal); Flush DNS, Restart Explorer, etc. (background execution)
- `/dns` — DNS Manager: switch to Cloudflare, Google, Quad9, etc. — applies via PowerShell `Set-DnsClientServerAddress`
- `/restore` — Create Windows System Restore Point via PowerShell `Checkpoint-Computer`; Open System Restore wizard
- `/settings` — Theme, font size, check for updates (queries GitHub releases API)
- `/github` — GitHub Push (Replit dev environment only; shows friendly message in desktop app)

## Design

- **Primary theme**: Black background with crimson red accent (hue 0)
- **13 accent colors**: Crimson, Inferno, Ember, Gold, Toxic, Matrix, Neon, Ice, Arctic, Void, Ultra, Plasma, Pulse
- **Dark/Light mode**: Toggle in header, persisted to localStorage
- **Color swatches**: Click in header for instant theme switching (synchronous, no flash)

## Tweaks Behavior

- Toggle saves state instantly via `PATCH /api/tweaks/:id` to JSON storage
- 47 tweaks across: debloat, privacy, performance, gaming, system, browser
- "View CMD" shows correct command: `enable` command when tweak is off, `disable` command when on
- "Export .ps1" generates a complete Administrator PowerShell script for all active tweaks
- Tweaks are applied by the user running the exported `.ps1` script as Administrator

## Windows Execution Logic (routes.ts)

- **Utilities**: Long-running commands (SFC, DISM, CheckDisk, Network Reset, Restart Explorer) open a new `cmd.exe` terminal window. GUI tools (Disk Cleanup, System Restore) spawn directly. Background commands (Flush DNS, registry tweaks) execute via `exec` and return output.
- **DNS**: Applies via PowerShell `Set-DnsClientServerAddress` on all active network adapters
- **Restore Points**: Creates via PowerShell `Checkpoint-Computer -RestorePointType MODIFY_SETTINGS`; `Enable-ComputerRestore` called first to ensure System Protection is on

## Build / Release

Run `BUILD_EXE.bat` on a Windows machine to produce the installer:
1. Installs dependencies (`npm install`)
2. Builds frontend (`npm run build`)
3. Packages with electron-builder → `release/JGoode A.I.O PC Tool Setup X.X.X.exe`

GitHub: [JaidenGoode/JGoode-s-AIO-PC-Tool](https://github.com/JaidenGoode/JGoode-s-AIO-PC-Tool)

## Notes

- App requires Administrator privileges for most tweaks (DNS, restore points, registry edits)
- GPU usage shows N/A in Replit dev environment (no GPU hardware); works on Windows
- Temperature sensors may show N/A on some systems (hardware support required)
- GitHub Push feature is Replit-only (uses OAuth connector); shows informative message in desktop app
