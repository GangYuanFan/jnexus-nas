@echo off
echo ==================================================
echo    J.NAS Tool - Windows Packaging Script
echo ==================================================

echo [1/3] Installing dependencies...
pip install -r nas_requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies. Please check your internet connection.
    pause
    exit /b %errorlevel%
)

echo [2/3] Installing PyInstaller...
pip install pyinstaller
if %errorlevel% neq 0 (
    echo ERROR: Failed to install PyInstaller.
    pause
    exit /b %errorlevel%
)

echo [3/3] Packaging into .exe...
:: --noconsole: No terminal window on start
:: --onefile: Single executable
:: --add-data "nas;nas": Bundle the nas folder into the exe
pyinstaller --noconsole --onefile --add-data "nas;nas" nas_gui.py

if %errorlevel% eq 0 (
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
