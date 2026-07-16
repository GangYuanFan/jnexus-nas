@echo off

REM Check for ffmpeg.exe in nas/bin — download if missing
if not exist nas\bin\ffmpeg.exe (
    echo [PRE] ffmpeg.exe not found. Downloading portable build...
    if not exist nas\bin mkdir nas\bin
    echo Downloading ffmpeg...
    REM Use PowerShell to download & extract just ffmpeg.exe from gyan.dev's essentials zip
    powershell -Command ^
        "$ProgressPreference='SilentlyContinue'; ^
         Invoke-WebRequest -Uri 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' ^
             -OutFile '%TEMP%\ffmpeg-release-essentials.zip'; ^
         Add-Type -AssemblyName System.IO.Compression.FileSystem; ^
         $zip = [System.IO.Compression.ZipFile]::OpenRead('%TEMP%\ffmpeg-release-essentials.zip'); ^
         $entry = $zip.Entries | Where-Object { $_.Name -eq 'ffmpeg.exe' } | Select-Object -First 1; ^
         if ($entry) { ^
             [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, 'nas\bin\ffmpeg.exe', $true) ^
         } ^
         $zip.Dispose(); ^
         Remove-Item '%TEMP%\ffmpeg-release-essentials.zip'"
    if not exist nas\bin\ffmpeg.exe (
        echo [WARN] ffmpeg download failed — thumbnails will need system ffmpeg installed
    ) else (
        echo [OK] ffmpeg.exe ready in nas\bin\ (suppressed black window)
    )
) else (
    echo [PRE] ffmpeg.exe already present in nas\bin\
)

@echo on
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
