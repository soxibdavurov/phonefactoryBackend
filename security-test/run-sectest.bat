@echo off
setlocal enableextensions enabledelayedexpansion
chcp 65001 >nul
cd /d "%~dp0.."

echo ================================================
echo   보안 실험 - 서버 2대 (baseline+defended)
echo ================================================
echo.
echo [0] autocannon 확인...
call npm ls autocannon >nul 2>&1 || call npm install --save-dev autocannon >nul 2>&1

echo [0b] 이전 결과 및 로그 정리...
del /q "security-test\results-baseline.json" "security-test\results-defended.json" "security-test\perf-baseline.json" "security-test\perf-defended.json" "security-test\srv-baseline.log" "security-test\srv-defended.log" 2>nul
echo.

call :killport 3999
call :killport 3998

rem --- 서버 2대를 동시에, 각각 자신의 모드와 별도 포트로 실행 ---
echo [1] BASELINE server (port 3999, SECURITY=off)...
start "sectest-base" cmd /c "set SECURITY=off&&set PORT=3999&&npm start > security-test\srv-baseline.log 2>&1"
echo [2] DEFENDED server (port 3998, 방어 적용)...
start "sectest-def" cmd /c "set SECURITY=&&set PORT=3998&&npm start > security-test\srv-defended.log 2>&1"

echo     서버 대기 중...
call :waitport 3999 || goto :fail
call :waitport 3998 || goto :fail
echo     두 서버 준비 완료.
echo.

rem --- AVVAL unumdorlik (rate-limit hali toza) ---
echo [3] 성능 측정 - baseline (3999)...
set MODE=baseline
set TEST_URL=http://127.0.0.1:3999
node -r dotenv/config security-test/perf.js

echo [4] 성능 측정 - defended (3998)...
set MODE=defended
set TEST_URL=http://127.0.0.1:3998
node -r dotenv/config security-test/perf.js

rem --- 이후 공격 테스트 ---
echo [5] 공격 테스트 - baseline (3999)...
set MODE=baseline
set TEST_URL=http://127.0.0.1:3999
node -r dotenv/config security-test/run.js

echo [6] 공격 테스트 - defended (3998)...
set MODE=defended
set TEST_URL=http://127.0.0.1:3998
node -r dotenv/config security-test/run.js

echo.
echo [7] 결과표 생성 중...
node security-test/report.js > "security-test\REPORT.txt" 2>&1
echo. >> "security-test\REPORT.txt"
echo --- 서버 모드 확인 (SECURITY_ON) --- >> "security-test\REPORT.txt"
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
echo 완료! 결과: security-test\REPORT.txt
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
  echo     오류: 포트 %~1 이(가) 120초 내에 열리지 않음. 로그: security-test\srv-*.log
  exit /b 1
)
timeout /t 2 >nul
goto wl

:killport
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%~1 " ^| findstr "LISTENING"') do taskkill /PID %%p /T /F >nul 2>&1
exit /b 0

:fail
echo.
echo 서버 실행 실패. security-test\srv-baseline.log 및 srv-defended.log 를 확인하십시오.
call :killport 3999
call :killport 3998
pause
exit /b 1
