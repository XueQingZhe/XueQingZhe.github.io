@echo off
chcp 65001 >nul
cd /d "%~dp0"
node tools/open-design-preview.mjs
pause
