@echo off
REM ZoneVault - Quick Local Start (No Admin Required)
REM Just run this - it copies files and opens XAMPP instructions

color 0A
title ZoneVault Setup

echo.
echo ========================================
echo     ZoneVault Local Development
echo ========================================
echo.

REM Check if XAMPP is installed
if not exist "C:\xampp\htdocs" (
    echo [ERROR] XAMPP not found at C:\xampp
    echo.
    echo Please install XAMPP first:
    echo https://www.apachefriends.org
    echo.
    pause
    exit /b 1
)

echo [Step 1] Copying project to XAMPP...
if exist "C:\xampp\htdocs\zonevault" (
    echo Removing old version...
    rmdir /s /q "C:\xampp\htdocs\zonevault" >nul 2>&1
)

mkdir "C:\xampp\htdocs\zonevault"
xcopy /E /I /Y "%cd%\*" "C:\xampp\htdocs\zonevault\" >nul 2>&1

if %errorlevel% neq 0 (
    echo [ERROR] Failed to copy files
    pause
    exit /b 1
)
echo [OK] Files copied!

echo.
echo [Step 2] Opening XAMPP Control Panel...
echo.
echo    IMPORTANT - Please do this manually:
echo    1. In XAMPP Control Panel, START both:
echo       - Apache
echo       - MySQL
echo.
echo    2. Create database at phpmyadmin:
echo       - http://localhost/phpmyadmin
echo       - Create new database: "zonevault" (UTF-8)
echo.

start "" "C:\xampp\xampp-control.exe"

echo.
echo [Step 3] Waiting for services...
echo Please start Apache and MySQL in XAMPP Control Panel...
echo.
timeout /t 5 >nul

echo.
echo ========================================
echo        Opening Application...
echo ========================================
echo.
timeout /t 3 >nul

start "" "http://localhost/zonevault/index.html"
start "" "http://localhost/phpmyadmin"

echo.
echo Your app will open in the browser.
echo.
echo Access URLs:
echo   Main App: http://localhost/zonevault/index.html
echo   phpMyAdmin: http://localhost/phpmyadmin
echo   API: http://localhost/zonevault/api/
echo.
pause
