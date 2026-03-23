<div align="center">

# JGoode's A.I.O PC Tool

**All-in-one Windows optimization, privacy, and performance desktop app**

*PowerShell tweaks · Real-time hardware monitoring · System cleaner · DNS manager · Restore points · Utilities*

[![Version](https://img.shields.io/badge/version-2.5.1-red?style=flat-square)](../../releases)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-blue?style=flat-square)](../../releases)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

</div>

---

## Download & Install

1. Go to the [**Releases**](../../releases) page
2. Download the latest `JGoode-AIO-PC-Tool-Setup.exe`
3. Run the installer — **right-click → Run as Administrator**
4. Launch **JGoode's A.I.O PC Tool** from your desktop

> **Requires Windows 10 or Windows 11. All tweaks run as Administrator automatically.**

---

## Project Structure — What Every File Does

> **New to coding?** This is your map. When you want to change something, this tells you exactly which file to open.

```
JGoode-s-AIO-PC-Tool/
│
├── BUILD_EXE.bat              ← Double-click this to build your .exe installer
│
│
│── PAGES (each screen in the app)
│   client/src/pages/
│   ├── dashboard.tsx          ← Home screen: health score, live usage, temps
│   ├── tweaks.tsx             ← PowerShell tweaks page (apply/undo)
│   ├── cleaner.tsx            ← System cleaner (scan & delete junk files)
│   ├── restore-points.tsx     ← Create & manage Windows restore points
│   ├── dns-manager.tsx        ← Switch DNS (Cloudflare, Google, custom)
│   ├── startup.tsx            ← Startup program manager
│   ├── utilities.tsx          ← Quick-launch tools (ShutUp10, Titus, etc.)
│   └── settings.tsx           ← Theme colors, font size, dark/light mode
│
│
│── TWEAKS (PowerShell commands that make changes to Windows)
│   tweaks/
│   ├── seed.ts                ← Tweak names, descriptions, categories, warnings
│   ├── commands.ts            ← The actual PowerShell commands (apply + undo)
│   ├── detect.ts              ← Detects which tweaks are already ON your PC
│   ├── presets.ts             ← Gaming / Privacy / Performance preset groups
│   ├── impacts.ts             ← Impact rating (High / Medium / Low) per tweak
│   └── conflicts.ts           ← Tweaks that conflict with each other
│
│
│── UI COMPONENTS (reusable pieces used across pages)
│   client/src/components/
│   ├── layout.tsx             ← The outer window frame (title bar, theme bar)
│   ├── app-sidebar.tsx        ← Left navigation sidebar
│   ├── stat-card.tsx          ← The small cards (CPU, RAM, GPU, Storage)
│   ├── theme-provider.tsx     ← Handles dark mode + accent color selection
│   └── ui/                   ← Generic UI pieces (buttons, cards, inputs, etc.)
│
│
│── BACKEND (server that runs on localhost inside the app)
│   server/
│   ├── routes.ts              ← All API calls: temps, usage, cleaner, tweaks
│   ├── github.ts              ← Pushes code to GitHub (dev tool)
│   └── executables/           ← Bundled .exe tools (DDU, TCP Optimizer, etc.)
│
│
│── ELECTRON (what turns the web app into a real .exe desktop window)
│   electron/
│   ├── main.cjs               ← Controls the window, launches LHM silently
│   └── preload.cjs            ← Bridge between the window and PowerShell
│
│
│── SHARED (types used by both the frontend AND backend)
│   shared/
│   ├── schema.ts              ← Data shapes (what a Tweak looks like, etc.)
│   └── routes.ts              ← API route definitions
│
│
│── STYLES & CONFIG
│   client/src/index.css       ← Global styles, theme colors, dark mode
│   tailwind.config.ts         ← Tailwind CSS configuration
│   vite.config.ts             ← Frontend bundler config (don't touch)
│   electron-builder.json      ← Installer config (.exe name, icon, etc.)
│   package.json               ← All dependencies and scripts
```

---

### Quick Reference — "I want to change..."

| What you want to change | File to open |
|---|---|
| A tweak's description or category | `tweaks/seed.ts` |
| What a tweak's PowerShell command does | `tweaks/commands.ts` |
| A page's layout or content | `client/src/pages/<pagename>.tsx` |
| The sidebar links | `client/src/components/app-sidebar.tsx` |
| Theme colors or accent options | `client/src/components/theme-provider.tsx` |
| The app window title or icon | `electron-builder.json` |
| The installer name or version | `electron-builder.json` + `package.json` |

---

## Features

### System Tweaks
Apply and undo real PowerShell-based registry and service tweaks — individually or all at once with presets.

| Category | Examples |
|---|---|
| **Privacy & Telemetry** | Disable telemetry, CEIP, data collection, activity history |
| **Debloat Windows** | Cortana, Copilot/Recall, Edge policies, Location, Settings Sync |
| **Performance** | Ultimate Performance plan, Game Mode, GPU/CPU priority, SSD TRIM |
| **Gaming** | Disable GameBar/DVR, Fullscreen Optimizations, Fortnite process priority |
| **Windows AI** | Disable Copilot, Recall, AI features, lock screen ads |
| **Network** | DNS manager, adapter tweaks, Nagle's algorithm |
| **Appearance** | Dark mode, sticky keys disable, Show hidden files |

**Presets:** Gaming · Privacy · Performance · Select All

---

### Live Hardware Monitor
Updated every 5–8 seconds:
- CPU usage & temperature
- RAM used / available
- GPU usage & temperature
- Disk read/write speeds

---

### System Cleaner
Scans and removes:
- Temporary files (`%TEMP%`, Windows Temp)
- Prefetch, Recycle Bin, Update cache, Event logs, Browser cache, Shader cache

Shows file count and size before cleaning.

---

### Restore Points
Create, list, and manage Windows System Restore points — no Control Panel needed.

---

### DNS Manager
Switch DNS with one click: Cloudflare · Google · Quad9 · Custom

---

## Build From Source

**Requirements:** Node.js 18+, Git, Windows

```bat
git clone https://github.com/JaidenGoode/JGoode-s-AIO-PC-Tool.git
cd JGoode-s-AIO-PC-Tool
npm install
```

Run in development mode:
```bat
npm run dev
```

Build the Windows installer:
```bat
BUILD_EXE.bat
```

The installer appears in the `/dist` folder.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop window | Electron |
| Frontend UI | React + TypeScript + Vite + Shadcn UI |
| Backend | Express (embedded in Electron) |
| Storage | JSON file (no database needed) |
| Tweaks | Real PowerShell scripts via Node.js |
| Hardware sensors | LibreHardwareMonitor (bundled) |
| Installer | electron-builder + NSIS |

---

## Disclaimer

This tool modifies Windows registry keys, services, and Group Policy settings. All changes are reversible — every tweak has an undo script built in. Create a restore point before applying tweaks (the app can do this for you).

---

<div align="center">
Made by <a href="https://github.com/JaidenGoode">JaidenGoode</a>
</div>
