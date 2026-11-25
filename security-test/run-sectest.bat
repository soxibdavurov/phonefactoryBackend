@echo off
setlocal enableextensions enabledelayedexpansion
chcp 65001 >nul
cd /d "%~dp0.."

echo ================================================
echo   보안 실험 (baseline + defended)
echo ================================================
echo.
echo [0] autocannon 확인...
call npm ls autocannon >nul 2>&1 || call npm install --save-dev autocannon
echo.

rem 이전 결과 삭제 - 이전 실행의 수치가 결과표에 섞이지 않도록 함
del /q "security-test\results-*.json" "security-test\perf-*.json" "security-test\attack-*.log" "security-test\perf-*.log" "security-test\REPORT.txt" 2>nul

rem ---------- ATTACKS ----------
echo [1/6] BASELINE 서버 (SECURITY=off) - 공격 테스트...
call :startserver off attack-baseline || goto :fail
set MODE=baseline
node -r dotenv/config security-test/run.js
call :killport

echo.
echo [2/6] DEFENDED 서버 (방어 적용) - 공격 테스트...
call :startserver on attack-defended || goto :fail
set MODE=defended
node -r dotenv/config security-test/run.js
call :killport

rem ---------- PERFORMANCE (각각 초기화된 rate-limit 상태에서 실행) ----------
echo.
echo [3/6] BASELINE 서버 - 성능 측정...
call :startserver off perf-baseline || goto :fail
set MODE=baseline
node -r dotenv/config security-test/perf.js
call :killport

echo.
echo [4/6] DEFENDED 서버 - 성능 측정 (rate limiter만 비활성화, 나머지 방어는 활성)...
call :startserver perf perf-defended || goto :fail
set MODE=defended
node -r dotenv/config security-test/perf.js
call :killport

rem ---------- REPORT ----------
echo.
echo [5/6] 결과표 생성 중...
node security-test/report.js > "security-test\REPORT.txt" 2>&1
echo. >> "security-test\REPORT.txt"
echo --- 서버 모드 확인 (SECURITY_ON) --- >> "security-test\REPORT.txt"
echo [baseline 공격 테스트 서버]: >> "security-test\REPORT.txt"
findstr /C:"SECTEST" "security-test\attack-baseline.log" >> "security-test\REPORT.txt" 2>nul
echo [defended 공격 테스트 서버]: >> "security-test\REPORT.txt"
findstr /C:"SECTEST" "security-test\attack-defended.log" >> "security-test\REPORT.txt" 2>nul
echo [baseline 성능 측정 서버]: >> "security-test\REPORT.txt"
findstr /C:"SECTEST" "security-test\perf-baseline.log" >> "security-test\REPORT.txt" 2>nul
echo [defended 성능 측정 서버]: >> "security-test\REPORT.txt"
findstr /C:"SECTEST" "security-test\perf-defended.log" >> "security-test\REPORT.txt" 2>nul

echo.
echo [6/6] 결과
echo ================================================
type "security-test\REPORT.txt"
echo ================================================
echo.
echo 완료! 결과 파일:
echo   %cd%\security-test\REPORT.txt
echo.
pause
exit /b 0

rem === 지정한 모드로 서버 실행: %1=off/on/perf, %2=로그 파일명
:startserver
call :killport
rem perf = 방어 활성, 단 단일 IP 부하가 429로 바뀌지 않도록 rate limiter만 우회
if /i "%~1"=="off" (
  start "sectest-srv" cmd /c "set SECURITY=off&&set PERF_NO_RATELIMIT=&&set PORT=3999&&npm start > security-test\%~2.log 2>&1"
) else if /i "%~1"=="perf" (
  start "sectest-srv" cmd /c "set SECURITY=&&set PERF_NO_RATELIMIT=1&&set PORT=3999&&npm start > security-test\%~2.log 2>&1"
) else (
  start "sectest-srv" cmd /c "set SECURITY=&&set PERF_NO_RATELIMIT=&&set PORT=3999&&npm start > security-test\%~2.log 2>&1"
)
set /a _tries=0
echo     서버 대기 중 (port 3999)...
:waitloop
powershell -NoProfile -Command "try{$c=New-Object Net.Sockets.TcpClient;$c.Connect('127.0.0.1',3999);$c.Close();exit 0}catch{exit 1}" >nul 2>&1
if not errorlevel 1 (
  echo     서버 준비 완료.
  timeout /t 1 >nul
  exit /b 0
)
set /a _tries+=1
if !_tries! GEQ 60 (
  echo     오류: 서버가 120초 내에 시작되지 않음. 로그: security-test\%~2.log
  exit /b 1
)
timeout /t 2 >nul
goto waitloop

rem === 포트 3999의 프로세스(하위 프로세스 포함)를 종료하고 포트가 비워질 때까지 대기
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
echo 서버 실행 실패. security-test\*.log 파일의 오류를 확인하십시오.
call :killport
pause
exit /b 1
