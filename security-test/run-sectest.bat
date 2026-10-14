@echo off
setlocal enableextensions enabledelayedexpansion
chcp 65001 >nul
cd /d "%~dp0.."

echo ================================================
echo   Xavfsizlik tajribasi (baseline + defended)
echo ================================================
echo.
echo [0] autocannon tekshiruvi...
call npm ls autocannon >nul 2>&1 || call npm install --save-dev autocannon
echo.

rem ---------- ATTACKS ----------
echo [1/6] BASELINE server (SECURITY=off) - hujum testlari...
call :startserver off attack-baseline || goto :fail
set MODE=baseline
node -r dotenv/config security-test/run.js
call :killport

echo.
echo [2/6] DEFENDED server (himoya yoqilgan) - hujum testlari...
call :startserver on attack-defended || goto :fail
set MODE=defended
node -r dotenv/config security-test/run.js
call :killport

rem ---------- PERFORMANCE (har biri toza rate-limit holatida) ----------
echo.
echo [3/6] BASELINE server - unumdorlik...
call :startserver off perf-baseline || goto :fail
set MODE=baseline
node -r dotenv/config security-test/perf.js
call :killport

echo.
echo [4/6] DEFENDED server - unumdorlik...
call :startserver on perf-defended || goto :fail
set MODE=defended
node -r dotenv/config security-test/perf.js
call :killport

rem ---------- REPORT ----------
echo.
echo [5/6] Jadval tayyorlanmoqda...
node security-test/report.js > "security-test\REPORT.txt" 2>&1
echo. >> "security-test\REPORT.txt"
echo --- Server rejimi tasdigi (SECURITY_ON) --- >> "security-test\REPORT.txt"
echo [baseline hujum serveri]: >> "security-test\REPORT.txt"
findstr /C:"SECTEST" "security-test\attack-baseline.log" >> "security-test\REPORT.txt" 2>nul
echo [defended hujum serveri]: >> "security-test\REPORT.txt"
findstr /C:"SECTEST" "security-test\attack-defended.log" >> "security-test\REPORT.txt" 2>nul

echo.
echo [6/6] NATIJALAR
echo ================================================
type "security-test\REPORT.txt"
echo ================================================
echo.
echo Tayyor! Shu jadvalni yoki quyidagi faylni menga yuboring:
echo   %cd%\security-test\REPORT.txt
echo.
pause
exit /b 0

rem === server ni berilgan rejimda ishga tushirish: %1=off/on, %2=log nomi
:startserver
call :killport
if /i "%~1"=="off" (
  start "sectest-srv" cmd /c "set SECURITY=off&&set PORT=3999&&npm start > security-test\%~2.log 2>&1"
) else (
  start "sectest-srv" cmd /c "set SECURITY=&&set PORT=3999&&npm start > security-test\%~2.log 2>&1"
)
set /a _tries=0
echo     Server kutilmoqda (port 3999)...
:waitloop
powershell -NoProfile -Command "try{$c=New-Object Net.Sockets.TcpClient;$c.Connect('127.0.0.1',3999);$c.Close();exit 0}catch{exit 1}" >nul 2>&1
if not errorlevel 1 (
  echo     Server tayyor.
  timeout /t 1 >nul
  exit /b 0
)
set /a _tries+=1
if !_tries! GEQ 60 (
  echo     XATO: server 120 soniyada ko'tarilmadi. Log: security-test\%~2.log
  exit /b 1
)
timeout /t 2 >nul
goto waitloop

rem === port 3999 dagi jarayonni (va butun daraxtini) o'ldirib, port bo'shaguncha kutish
:killport
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3999" ^| findstr "LISTENING"') do taskkill /PID %%p /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq sectest-srv*" /T /F >nul 2>&1
powershell -NoProfile -Command "try{$c=New-Object Net.Sockets.TcpClient;$c.Connect('127.0.0.1',3999);$c.Close();exit 0}catch{exit 1}" >nul 2>&1
if not errorlevel 1 (
  timeout /t 1 >nul
  goto killport
)
exit /b 0

:fail
echo.
echo Server ishga tushmadi. security-test\*.log fayllaridagi xatoni tekshiring.
call :killport
pause
exit /b 1
