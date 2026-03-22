<div align="center">

# JGoode's A.I.O PC Tool

**All-in-one Windows optimization, privacy, and performance desktop app**

*51 system tweaks · Real-time hardware monitoring · System cleaner · DNS manager · Restore points · Utilities*

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

## Features

### System Tweaks (51 total)
Apply and undo real PowerShell-based registry and service tweaks — individually or all at once with presets.

| Category | Examples |
|---|---|
| **Privacy & Telemetry** | Disable telemetry, CEIP, data collection, activity history |
| **Debloat Windows** | Full CTT-based debloat: Cortana, Copilot/Recall, Edge policies, Location, Settings Sync, Advertising |
| **Performance** | Ultimate Performance plan, Game Mode, GPU/CPU priority, SSD TRIM, prefetch tuning |
| **Gaming** | Disable GameBar/DVR, Fullscreen Optimizations, GPU & CPU priority for games, Fortnite process priority |
| **Windows AI & Copilot** | Disable Windows Copilot, Recall, AI features, lock screen ads |
| **Security** | Disable Remote Assistance, Phone Link, Windows Defender optional components |
| **Network** | DNS manager (Cloudflare, Google, Quad9, Custom), P2P update delivery, adapter tweaks |
| **Appearance** | Dark mode, sticky keys disable, Show hidden files |

**Presets:** Gaming · Privacy · Performance · Select All — apply a full category in one click.

---

### Live Hardware Monitor
Real-time graphs updated every second:
- CPU usage & temperature
- RAM used / available
- GPU usage & VRAM
- Disk read/write speeds

---

### System Cleaner
Scans and removes:
- Temporary files (`%TEMP%`, Windows Temp)
- Prefetch files
- Recycle Bin
- Windows Update cache
- Event logs

Shows file count and size before cleaning, with a full history log.

---

### Restore Points
Create, list, and manage Windows System Restore points directly inside the app — no Control Panel needed.

---

### DNS Manager
Switch your DNS with one click:
- **Cloudflare** (1.1.1.1 / 1.0.0.1)
- **Google** (8.8.8.8 / 8.8.4.4)
- **Quad9** (9.9.9.9 / 149.112.112.112)
- **Custom** — enter any DNS you want

---

### Utilities
Quick-launch common Windows tools without digging through menus:
- Disk Management, Event Viewer, Device Manager, Task Scheduler
- Resource Monitor, System Properties, Group Policy Editor
- Network adapters, Startup apps, Installed programs, and more

---

## Build From Source

**Requirements:** Node.js 18+, Git, Windows (for building the installer)

```bat
git clone https://github.com/JaidenGoode/JGoode-s-AIO-PC-Tool.git
cd JGoode-s-AIO-PC-Tool
npm install
```

To run in development mode:
```bat
npm run dev
```

To build the Windows installer:
```bat
BUILD_EXE.bat
```
The installer will appear in the `/dist` folder.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop | Electron 33 |
| Frontend | React + TypeScript + Vite + TanStack Query + Shadcn UI |
| Backend | Express (TypeScript) embedded in Electron |
| Storage | JSON file (`~/.jgoode-aio/data.json`) — no database required |
| Tweaks | Real PowerShell scripts executed via Node.js child process |
| Hardware | `systeminformation` npm package |
| Installer | electron-builder + NSIS |

---

## Disclaimer

This tool modifies Windows registry keys, services, and Group Policy settings. All changes are reversible — every tweak has an undo script built in. Use at your own risk. Creating a restore point before applying tweaks is recommended (the app can do this for you).

---

<div align="center">
Made by <a href="https://github.com/JaidenGoode">JaidenGoode</a>
</div>
