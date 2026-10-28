@echo off
setlocal
title Cafe Canape - Quizabend Multiplayer
cd /d "%~dp0"
echo.
echo Cafe Canape - Quizabend Multiplayer
echo ==================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt auf diesem Computer.
  echo Bitte Node.js LTS von https://nodejs.org installieren.
  echo Danach diese Datei erneut starten.
  echo Es werden keine weiteren Programme oder npm-Pakete benoetigt.
  echo.
  pause
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"
if errorlevel 1 (
  echo Bitte Node.js auf Version 20 oder neuer aktualisieren.
  echo Download: https://nodejs.org
  pause
  exit /b 1
)
echo Der Browser oeffnet sich, sobald der Server bereit ist.
echo Dieses Fenster waehrend des Spiels geoeffnet lassen.
echo Beenden mit Strg+C.
echo.
node start.js
echo.
echo Server beendet. Dieses Fenster kann geschlossen werden.
pause
