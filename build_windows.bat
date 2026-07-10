@echo off
setlocal enabledelayedexpansion

echo ==================================================
echo    J.NAS Tool - Windows Packaging Script (Enhanced)
echo ==================================================

echo [1/3] Installing dependencies...
python -m pip install --upgrade pip
python -m pip install -r nas_requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install dependencies. 
    echo Please check your internet connection or Python installation.
    pause
    exit /b 1
)

echo [2/3] Installing PyInstaller...
python -m pip install pyinstaller
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install PyInstaller.
    pause
    exit /b 1
)

echo [3/3] Packaging into .exe...
:: Use 'python -m PyInstaller' to avoid PATH issues
python -m PyInstaller --noconsole --onefile --add-data "nas;nas" nas_gui.py

if %errorlevel% equ 0 (
    echo.
    echo ==================================================
    echo SUCCESS! Your executable is in the 'dist' folder:
    echo dist\\nas_gui.exe
    echo ==================================================
) else (
    echo.
    echo ERROR: Packaging failed.
)

pause
