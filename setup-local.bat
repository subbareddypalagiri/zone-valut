@echo off
REM ZoneVault Local Development Setup Script
REM This script copies the project to XAMPP and starts services

color 0A
title ZoneVault Local Setup

echo.
echo ========================================
echo   ZoneVault Local Development Setup
echo ========================================
echo.

REM Check if XAMPP is installed
if not exist "C:\xampp\htdocs" (
    echo [ERROR] XAMPP not found at C:\xampp
    echo Please install XAMPP first from: https://www.apachefriends.org
    pause
    exit /b 1
)

echo [1/4] Copying project files to XAMPP...
REM Create destination folder if it doesn't exist
if not exist "C:\xampp\htdocs\zonevault" mkdir "C:\xampp\htdocs\zonevault"

REM Copy all files (overwrite existing)
xcopy /E /I /Y "%cd%\*" "C:\xampp\htdocs\zonevault\" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Failed to copy files
    pause
    exit /b 1
)
echo [OK] Files copied to C:\xampp\htdocs\zonevault

echo.
echo [2/4] Starting XAMPP services...

REM Start Apache
echo Starting Apache...
start "" "C:\xampp\apache\apache_stop.bat" >nul 2>&1
timeout /t 2 >nul
start "" "C:\xampp\apache\apache_start.bat" >nul 2>&1
timeout /t 3 >nul

REM Start MySQL
echo Starting MySQL...
start "" "C:\xampp\mysql\mysql_start.bat" >nul 2>&1
timeout /t 3 >nul

echo [OK] XAMPP services started

echo.
echo [3/4] Creating database...

REM Create database using mysql command
mysql -u root -e "CREATE DATABASE IF NOT EXISTS zonevault CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >nul 2>&1

if %errorlevel% neq 0 (
    echo [WARNING] Could not auto-create database. Please create it manually:
    echo   1. Open http://localhost/phpmyadmin
    echo   2. Create new database: zonevault (UTF-8)
) else (
    echo [OK] Database created/verified
)

echo.
echo [4/4] Opening application in browser...
timeout /t 2 >nul

REM Open the app in default browser
start "" "http://localhost/zonevault/index.html"

echo.
echo ========================================
echo   Setup Complete! ✓
echo ========================================
echo.
echo Your app is now running at:
echo   http://localhost/zonevault/index.html
echo.
echo Admin Panel (phpmyadmin):
echo   http://localhost/phpmyadmin
echo.
echo Keep this window open while developing.
echo.
pause
