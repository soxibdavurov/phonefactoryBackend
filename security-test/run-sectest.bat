@echo off
setlocal enableextensions enabledelayedexpansion
chcp 65001 >nul
cd /d "%~dp0.."

echo ================================================
echo   Xavfsizlik tajribasi - 2 server (baseline+defended)
echo ================================================
echo.
echo [0] autocannon tekshiruvi...
call npm ls autocannon >nul 2>&1 || call npm install --save-dev autocannon >nul 2>&1

echo [0b] Eski natija va loglarni tozalash...
del /q "security-test\results-baseline.json" "security-test\results-defended.json" "security-test\perf-baseline.json" "security-test\perf-defended.json" "security-test\srv-baseline.log" "security-test\srv-defended.log" 2>nul
echo.

call :killport 3999
call :killport 3998

rem --- IKKI serverni bir vaqtda, har biri O'Z rejimida, alohida portda ---
echo [1] BASELINE server (port 3999, SECURITY=off)...
start "sectest-base" cmd /c "set SECURITY=off&&set PORT=3999&&npm start > security-test\srv-baseline.log 2>&1"
echo [2] DEFENDED server (port 3998, himoya yoqilgan)...
start "sectest-def" cmd /c "set SECURITY=&&set PORT=3998&&npm start > security-test\srv-defended.log 2>&1"

echo     Serverlar kutilmoqda...
call :waitport 3999 || goto :fail
call :waitport 3998 || goto :fail
echo     Ikkala server tayyor.
echo.

rem --- AVVAL unumdorlik (rate-limit hali toza) ---
echo [3] Unumdorlik - baseline (3999)...
set MODE=baseline
set TEST_URL=http://127.0.0.1:3999
node -r dotenv/config security-test/perf.js

echo [4] Unumdorlik - defended (3998)...
set MODE=defended
set TEST_URL=http://127.0.0.1:3998
node -r dotenv/config security-test/perf.js

rem --- KEYIN hujumlar ---
echo [5] Hujum testlari - baseline (3999)...
set MODE=baseline
set TEST_URL=http://127.0.0.1:3999
node -r dotenv/config security-test/run.js

echo [6] Hujum testlari - defended (3998)...
set MODE=defended
set TEST_URL=http://127.0.0.1:3998
node -r dotenv/config security-test/run.js

echo.
echo [7] Jadval tayyorlanmoqda...
node security-test/report.js > "security-test\REPORT.txt" 2>&1
echo. >> "security-test\REPORT.txt"
echo --- Server rejimi tasdigi (SECURITY_ON) --- >> "security-test\REPORT.txt"
echo [baseline server 3999]: >> "security-test\REPORT.txt"
findstr /C:"SECTEST" "security-test\srv-baseline.log" >> "security-test\REPORT.txt" 2>nul
echo [defended server 3998]: >> "security-test\REPORT.txt"
findstr /C:"SECTEST" "security-test\srv-defended.log" >> "security-test\REPORT.txt" 2>nul

echo.
echo ================================================
type "security-test\REPORT.txt"
echo ================================================

call :killport 3999
call :killport 3998
echo.
echo Tayyor! security-test\REPORT.txt ni menga yuboring.
echo.
pause
exit /b 0

:waitport
set /a _t=0
:wl
powershell -NoProfile -Command "try{$c=New-Object Net.Sockets.TcpClient;$c.Connect('127.0.0.1',%~1);$c.Close();exit 0}catch{exit 1}" >nul 2>&1
if not errorlevel 1 exit /b 0
set /a _t+=1
if !_t! GEQ 60 (
  echo     XATO: port %~1 120 soniyada ko'tarilmadi. Log: security-test\srv-*.log
  exit /b 1
)
timeout /t 2 >nul
goto wl

:killport
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%~1 " ^| findstr "LISTENING"') do taskkill /PID %%p /T /F >nul 2>&1
exit /b 0

:fail
echo.
echo Server ishga tushmadi. security-test\srv-baseline.log va srv-defended.log ni tekshiring.
call :killport 3999
call :killport 3998
pause
exit /b 1
