@echo off
echo [1/4] Cleaning old builds...
if exist build rd /s /q build
if exist dist rd /s /q dist

echo [2/4] Ensuring dependencies are installed...
python -m pip install --upgrade pip
python -m pip install requests flask Pillow PySide6

echo [3/4] Packaging Nas Tool...
python -m PyInstaller --noconfirm --onefile --windowed --add-data "nas;nas" --hidden-import requests --hidden-import flask --hidden-import PIL --hidden-import nas.unified_nexus nas_gui.py

echo [4/4] Done! Your executable is in the dist folder.
pause
