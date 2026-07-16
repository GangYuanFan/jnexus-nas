@echo off

if not exist nas\bin\mkdir nas\bin 2>nul
if not exist nas\bin\ffmpeg.exe goto download_ffmpeg
echo [PRE] ffmpeg.exe already present in nas\bin\
goto build

:download_ffmpeg
echo [PRE] Downloading portable ffmpeg.exe for video thumbnails...
powershell -Command "$p=New-Object System.Net.WebClient; $p.DownloadFile('https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip', '%TEMP%\ffmpeg.zip'); $z=[System.IO.Compression.ZipFile]::OpenRead('%TEMP%\ffmpeg.zip'); $e=($z.Entries|Where-Object{$_.Name -eq 'ffmpeg.exe'}|Select-Object -First 1); [System.IO.Compression.ZipFileExtensions]::ExtractToFile($e, 'nas\bin\ffmpeg.exe', $true); $z.Dispose(); del '%TEMP%\ffmpeg.zip'"
if exist nas\bin\ffmpeg.exe (
    echo [OK] ffmpeg.exe ready in nas\bin\
) else (
    echo [WARN] ffmpeg download failed - thumbnails will need system ffmpeg installed
)

:build
echo [1/4] Cleaning old builds...
if exist build rd /s /q build
if exist dist rd /s /q dist

echo [2/4] Ensuring dependencies are installed...
python -m pip install --upgrade pip
python -m pip install requests flask flask-cors python-dotenv psutil Pillow PySide6

echo [3/4] Packaging Nas Tool...
python -m PyInstaller --noconfirm nas_gui.spec

echo [4/4] Done! Your executable is in the dist folder.
pause
