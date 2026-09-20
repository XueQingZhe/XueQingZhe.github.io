@echo off
rem ---------------------------------------------------------------
rem  Copy the 349 referenced images from the old Jekyll repo into
rem  astro-site/public/, optionally converting PNG/JPG to WebP.
rem
rem  Pure ASCII on purpose: cmd.exe parses .bat with the system ANSI
rem  codepage (GBK here), so UTF-8 Chinese in this file would show
rem  as mojibake. Chinese output comes from Python instead.
rem ---------------------------------------------------------------
setlocal EnableExtensions
cd /d "%~dp0"

for /f "tokens=2 delims=:" %%a in ('chcp') do set "OLDCP=%%a"
set "OLDCP=%OLDCP: =%"
chcp 65001 >nul

set "PY="
python --version >nul 2>nul && set "PY=python"
if not defined PY py --version >nul 2>nul && set "PY=py"
if not defined PY (
  echo.
  echo   Python not found. Install from https://www.python.org/downloads/
  echo.
  pause
  goto :eof
)

:menu
cls
echo.
echo   ==================================================
echo      Copy images: old Jekyll repo  --^>  astro-site
echo   ==================================================
echo.
echo     [1]  DRY RUN   show what would be copied
echo     [2]  COPY      keep original PNG/JPG  (~308 MB)
echo     [3]  COPY+WEBP convert to WebP        (much smaller, recommended)
echo.
echo     [0]  QUIT
echo.
set "c="
set /p "c=  choice: "

if "%c%"=="1" goto a1
if "%c%"=="2" goto a2
if "%c%"=="3" goto a3
if "%c%"=="0" goto quit
goto menu

:a1
call "%PY%" migrate_projects.py --assets-only --dry-run
goto done
:a2
call "%PY%" migrate_projects.py --assets-only
goto done
:a3
call "%PY%" migrate_projects.py --assets-only --webp
goto done

:done
echo.
pause
goto menu

:quit
if defined OLDCP chcp %OLDCP% >nul
endlocal
