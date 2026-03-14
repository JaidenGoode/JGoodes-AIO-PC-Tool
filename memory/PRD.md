# JGoode A.I.O PC Tool - PRD

## Original Problem Statement
Debug the tweaks page and make sure they enable to the proper safe trusted tweaked values and also make sure they all revert to their proper Windows defaults. Then improve everything possible without breaking anything. Make the app always silently detect if tweaks are optimized or reverted automatically.

## Architecture
- **Frontend**: React + TypeScript (Vite) - Electron desktop app
- **Backend**: Express/Node.js with Drizzle ORM (PostgreSQL)
- **Tweaks System**: TypeScript modules in `/tweaks/` directory

## What's Been Implemented (Jan 2026)

### Session 1: Core Bug Fixes (commands.ts)
1. Enable Game Mode - Disable now sets values to 0
2. Optimize DNS Resolution - Disable deletes override keys
3. Optimize Boot Configuration - Disable sets N/0/0
4. Enable SSD TRIM - Disable sets DisableDeleteNotify=1
5. Enable Receive Side Scaling - Disable runs rss=disabled

### Session 1: Detection Fixes (detect.ts)
- Added detection for 8 omitted tweaks
- Fixed Gaming Task Priority detection

### Session 2: Data Quality Improvements
1. Nagle's Algorithm revert - Now deletes keys instead of invalid value 0
2. Mouse Acceleration revert - Added MouseSensitivity reset
3. Added SuperFetch <-> Boot Config conflict
4. 18 missing impact ratings added (87/87 complete)
5. Fixed 2 phantom preset titles (WinRM, RemoteRegistry) - replaced with real privacy tweaks
6. Fixed 7 TypeScript errors in utilities.tsx

### Session 3: Auto-Detection & Professional Polish
1. **Silent auto-detect on app open** - runs immediately on mount
2. **Periodic background detection** - every 60 seconds silently
3. **Window focus re-detection** - triggers on window.focus + Electron onWindowFocus
4. **Status bar optimization count** - shows "X/Y optimized" with scan status
5. **Sidebar active count badge** - shows number of active tweaks next to "Tweaks" nav
6. **Command palette fix** - "Enable all 47 tweaks" now uses dynamic count
7. **Last scan timestamp** - tweaks page and status bar show when last scanned
8. **Privacy preset expanded** - added 6 real telemetry/tracking tweaks to privacy preset
9. **Restart/Admin badges** on tweak cards
10. **Command dialog context** - shows "revert" for undo commands

## Verification
- 87/87 command coverage (PASS)
- 87/87 detection coverage (PASS)
- 87/87 impact coverage (PASS)
- 0 identical enable/disable pairs (PASS)
- 0 orphaned preset titles (PASS)
- 0 TypeScript errors (PASS)
- Clean Vite build (PASS)

## Backlog
- P1: Test all tweaks on actual Windows hardware
- P2: Add undo confirmation dialog for high-impact tweaks
- P2: Consider adding "safe mode" rollback (batch undo all tweaks with one click)
