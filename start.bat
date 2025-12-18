@echo off
echo ========================================
echo TaxiCab PWA - Quick Start
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    echo.
    call npm install
    echo.
    echo Dependencies installed!
    echo.
) else (
    echo Dependencies already installed.
    echo.
)

echo Starting development server...
echo.
echo The app will be available at:
echo http://localhost:4030
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev

