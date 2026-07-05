@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo OTP RATE LIMITING TEST
echo ========================================
echo Testing: /api/auth/otp/send endpoint
echo Expected: 1-5 requests succeed, 6th request fails
echo Window: 10 minutes, Max: 5 requests
echo.

set url=http://localhost:5000/api/auth/otp/send
set body={"mobileNo":"9999999999","purpose":"login"}

for /L %%i in (1,1,6) do (
  echo.
  echo --- Request %%i ---
  curl -s -X POST !url! ^
    -H "Content-Type: application/json" ^
    -d "!body!" | find /v "" && timeout /t 1 /nobreak >nul
)

echo.
echo ========================================
echo TEST COMPLETE
echo ========================================
