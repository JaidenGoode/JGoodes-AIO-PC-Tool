@echo off
setlocal enabledelayedexpansion
title JGoode AIO PC Tool - Build

echo.
echo  ============================================
echo   JGoode AIO PC Tool -- Windows Build Script
echo  ============================================
echo.

REM ── Check Node.js ──────────────────────────────────────────────────────────
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  ERROR: Node.js is not installed.
    echo.
    echo  Download and install Node.js LTS from:
    echo    https://nodejs.org
    echo.
    echo  After installing Node.js, run this script again.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  Node.js found: %NODE_VER%
echo.

REM ── Step 1: Install dependencies ──────────────────────────────────────────
echo  [1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: npm install failed. Check that Node.js is installed correctly.
    pause
    exit /b 1
)
echo  Done.
echo.

REM ── Step 2: Build the app ─────────────────────────────────────────────────
echo  [2/4] Building app (React + Express)...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Build failed. Check the output above for details.
    pause
    exit /b 1
)
echo  Done.
echo.

REM ── Step 3: Install Electron tools ────────────────────────────────────────
echo  [3/4] Installing Electron packaging tools...
call npm install --save-dev electron@33 electron-builder@25
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Could not install Electron tools.
    pause
    exit /b 1
)
echo  Done.
echo.

REM ── Step 4: Package installer ─────────────────────────────────────────────
echo  [4/4] Packaging Windows installer (this takes 1-3 minutes)...
call npx electron-builder --win --x64
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Packaging failed. Check the output above for details.
    pause
    exit /b 1
)

echo.
echo  ============================================
echo   BUILD COMPLETE!
echo.
echo   Your installer is in the release\ folder.
echo   File: JGoodeAIO-Setup.exe
echo.
echo   Run it as Administrator to install.
echo  ============================================
echo.

explorer release
pause
