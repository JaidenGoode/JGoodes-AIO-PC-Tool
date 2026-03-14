# JGoode A.I.O PC Tool - PRD

## Original Problem Statement
Debug the tweaks page and make sure they enable to the proper safe trusted tweaked values and also make sure they all revert to their proper Windows defaults.

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

### Bug Fixes Applied

#### 1. Enable Game Mode - CRITICAL FIX
- **Bug**: Disable/revert command was identical to enable (both set values to 1)
- **Fix**: Disable now sets `AutoGameModeEnabled=0` and `AllowAutoGameMode=0`
- **Impact**: Revert now actually turns Game Mode OFF

#### 2. Optimize DNS Resolution - FIX
- **Bug**: Enable and disable wrote identical registry values
- **Fix**: Disable now uses `reg delete` to remove override keys, restoring Windows built-in DNS cache defaults
- **Impact**: Revert now properly clears DNS cache customizations

#### 3. Optimize Boot Configuration - FIX
- **Bug**: Enable and disable wrote identical values (BootOptimizeFunction=Y, Prefetcher=3, Superfetch=3)
- **Fix**: Disable now sets `BootOptimizeFunction=N`, `EnablePrefetcher=0`, `EnableSuperfetch=0`
- **Impact**: Revert now actually disables boot optimization

#### 4. Enable SSD TRIM Optimization - FIX
- **Bug**: Both enable and disable set `DisableDeleteNotify=0`
- **Fix**: Disable now sets `DisableDeleteNotify=1`
- **Impact**: Revert now actually disables TRIM

#### 5. Enable Receive Side Scaling (RSS) - FIX
- **Bug**: Both enable and disable enabled RSS
- **Fix**: Disable now sets `rss=disabled` and runs `Disable-NetAdapterRss`
- **Impact**: Revert now actually disables RSS

#### 6. Detection Script Updates (detect.ts)
- Added detection for: Enable Game Mode, SSD TRIM, TCP Auto-Tuning, Boot Configuration, DNS Resolution, SMBv1, RSS, TCP Fast Open
- Fixed: "Increase Gaming Task Priority" detection now checks `Scheduling Category=High` instead of `Priority=6` (which was the same in both enable/disable states)
- All 87 seed tweaks now have matching detection entries

## Verified
- All 87 tweaks have entries in commands.ts, detect.ts, and seed.ts
- Zero new TypeScript compilation errors introduced
- All enable/disable command pairs are now distinct

## Backlog
- P0: None
- P1: Pre-existing TypeScript errors in utilities.tsx (unrelated to tweaks)
- P2: Consider adding "safe mode" detection for SMBv1 (intentionally keeps disabled on revert for security)
