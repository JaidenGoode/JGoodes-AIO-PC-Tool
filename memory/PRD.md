# JGoode A.I.O PC Tool - PRD

## Original Problem Statement
Debug the tweaks page and make sure they enable to the proper safe trusted tweaked values and also make sure they all revert to their proper Windows defaults. Then improve everything possible without breaking anything.

## Architecture
- **Frontend**: React + TypeScript (Vite) - Electron desktop app
- **Backend**: Express/Node.js with Drizzle ORM (PostgreSQL)
- **Tweaks System**: TypeScript modules in `/tweaks/` directory
  - `commands.ts` - PowerShell enable/disable commands for each tweak
  - `detect.ts` - PowerShell detection script to scan Windows registry
  - `seed.ts` - Tweak definitions (title, description, category, warnings)
  - `impacts.ts` - Impact level ratings (High/Medium/Low)
  - `conflicts.ts` - Tweak conflict mappings
  - `presets.ts` - Quick-select preset groupings

## What's Been Implemented (Jan 2026)

### Session 1: Core Bug Fixes (commands.ts - 5 enable/disable fixes)
1. **Enable Game Mode** - Disable now sets values to 0 (was identical to enable)
2. **Optimize DNS Resolution** - Disable now deletes override keys (was identical)
3. **Optimize Boot Configuration** - Disable now sets BootOptimizeFunction=N, Prefetcher/Superfetch=0 (was identical)
4. **Enable SSD TRIM** - Disable now sets DisableDeleteNotify=1 (was identical)
5. **Enable Receive Side Scaling (RSS)** - Disable now runs rss=disabled (was identical)

### Session 1: Detection Fixes (detect.ts - 9 fixes)
- Added live detection for 8 previously-omitted tweaks: Game Mode, SSD TRIM, TCP Auto-Tuning, Boot Config, DNS Resolution, SMBv1, RSS, TCP Fast Open
- Fixed "Increase Gaming Task Priority" detection: now checks `Scheduling Category=High` instead of `Priority=6`

### Session 2: Comprehensive Improvements
1. **Nagle's Algorithm revert** - Now deletes TcpAckFrequency/TCPNoDelay keys (was setting invalid value 0)
2. **Mouse Acceleration revert** - Now resets MouseSensitivity to 10 (was missing from disable)
3. **Missing conflict mapping** - Added SuperFetch/SysMain <-> Boot Configuration conflict
4. **18 missing impact ratings** - All 87 tweaks now have High/Medium/Low impact ratings
5. **Restart/Admin badges** - Tweak cards now show "Restart" and "Admin" badges
6. **Command dialog context** - Now says "revert" when viewing undo command, not "apply"
7. **TypeScript errors fixed** - Fixed 7 pre-existing TS errors in utilities.tsx (exitCode/output/error properties)

## Verification
- 0 tweaks with identical enable/disable (ALL FIXED)
- 87/87 impact coverage (COMPLETE)
- 87/87 detection coverage (COMPLETE)
- 87/87 command coverage (COMPLETE)
- 0 TypeScript compilation errors
- Clean Vite build (710KB JS, 87KB CSS)

## Backlog
- P0: None
- P1: Test all tweaks on actual Windows hardware
- P2: Add tweak health check feature (auto-detect drift from expected state)
- P2: Consider adding undo confirmation dialog for high-impact tweaks
