# J.NAS Release Notes

## v1.7.0 (2026-07-29) — Async Copy Progress + Cache Speedup 🚀

### ✨ New Features
- **Async Copy/Move Progress**: 非同步背景執行大檔案複製/搬移，前端右下角浮動進度條顯示
- **Progress Bar Overlay**: 顯示完成 X/Y 個檔案 + 當前檔名，完成自動刷新
- **Sync Path Reliability**: 小量操作使用 `shutil`（安全穩定），大量操作背景用 `cp -a` 加速
- **`/api/copy-jobs` API**: 查詢進行中/最近完成的複製/搬移任務

### ⚡ Performance
- **Directory Cache**: 10s TTL 目錄快取，切換資料夾秒開
- **Avoid Directory Stat**: `is_dir()` 不再對目錄做 `stat()`，減少 WSL 開銷
- **Smart Cache Invalidation**: 複製、搬移、刪除、改名、上傳後自動清除相關快取
- **`cp -a` Fallback**: 背景非同步優先使用原生 `cp -a`，失敗自動降級到 `shutil`

### 🐛 Fixed
- WSL 中文字路徑 `[WinError 2]` 問題：同步路徑退回 `shutil`，非同步有自動降級

### 📦 Build
- Version bumped to 1.7.0

## v1.6.0 (2026-07-27) — Thumbnail Cache + Gallery Lazy Loading 🚀

### ⚡ Performance Overhaul
- **Thumbnail Cache Layer**: `.nas_thumbnails/` — MD5-hash keyed, 400px WebP, lazy generation + disk cache
- **Cursor Pagination**: `/nas/api/files?limit=&cursor=` — 游標分頁，向後相容（無 limit 回傳全部）
- **Media-List API**: New `/nas/api/media-list` endpoint — 只回傳圖片+影片，減少傳輸量
- **Gallery Lazy Loading**: IntersectionObserver — 只載入 viewport 內的縮圖，200px buffer
- **Infinite Scroll**: Gallery 模式一次載 50 張，滾到底自動加載
- **Browser Cache**: `Cache-Control: public, max-age=86400` — 瀏覽器快取 24h
- **Removed Cache-Busting**: 刪除所有 `&t=Date.now()&nocache=1`，讓 CDN/瀏覽器正常快取

### 📦 Build
- Version bumped to 1.6.0

## v1.2.2 (2026-07-16) — Bundled ffmpeg + No Black Window

### 🎬 ffmpeg Bundled into Build
- `build_windows.bat` now auto-downloads `ffmpeg.exe` from gyan.dev into `nas/bin/`
- Video thumbnails work out of the box — no separate ffmpeg install needed
- Binary stays in `nas/bin/`; git-ignored (too large), redownloaded on each clean build

### 🪟 No More Black Window Flash
- Added `_resolve_ffmpeg()` helper that resolves from `sys._MEIPASS` (bundle) first
- On Windows, passes `CREATE_NO_WINDOW` flag + `STARTF_USESHOWWINDOW(SW_HIDE)` to suppress the CMD window popup every time ffmpeg runs
- Falls back to system PATH gracefully if not bundled

### 📦 Build
- Version bumped to 1.2.2
- Bundled EXE size ~140 MB (was ~69 MB)

## v1.2.1 (2026-07-16) — Cross-Platform Thumbnails

### 🎬 Video Thumbnail Fix
- ffmpeg path lookup now cross-platform (Linux brew path → PATH → raw cmd)
- Windows NAS GUI now needs ffmpeg installed for .mp4 thumbnails
- Added ffmpeg prerequisite to README

### 📦 Build
- Version bumped to 1.2.1
- Rolled back to a979331 baseline, keeping only ffmpeg fix

## v1.2.0 (2026-07-16) — Batch Share, Password Fix, Auto Cleanup

### 🔗 New: Batch Share
- Multi-select files + 🔗 Share button → automatic ZIP bundling
- Single file = direct share; 2+ files = shared ZIP

### 🐛 Password Fix
- Share password no longer overwritten by NAS master password (apiFetch body injection removed)
- 3 contaminated shares cleaned up

### 🧹 Auto Cleanup for Expired Shares
- Expired symlinks, ZIP files, and metadata automatically removed on list/create
- `.shares/` folder now browsable despite broken symlinks

### 🖼️ Gallery & UX
- 600px thumbnails with video play button overlay
- Share dialog labels clarified: "Protect link with password (not your NAS password)"
- Password form page for protected share links (no more raw JSON error)
- WebDAV subprocess management (Start/Stop) in System page

## v1.1.0 (2026-07-15) — Trash Can + Feature Release

### 🗑️ New: Resource Recycle Bin (Trash)
- **Delete to trash** — Files & folders now go to a `.trash` directory instead of permanent deletion
- **Trash UI** — New sidebar page listing all trashed items with original path, deletion time, and size
- **Restore** — One-click restore to original location (auto-recreates missing parent directories)
- **Permanent delete** — Delete individual items from trash permanently
- **Empty Trash** — Bulk permanent deletion with double confirmation
- **Filename conflict handling** — Restored files get `_restored_N` suffix if original path already exists
- **Folder support** — Directories with sub-items are supported (recursive move/restore)

### 📦 Version Bump
- Bumped all project version strings to `1.1.0`

---

## v1.0.1 (2026-07-12) — Stability & Security Update

### 🛠️ Bug Fixes
- **Monaco Editor Recovery** — Fixed "failed to load" error by introducing `loader.min.js` and explicit module loading
- **Path Resolution Fallback** — Implemented Smart Path Fallback in backend to resolve 404 errors when accessing files relative to the app directory
- **System Info UI Fix** — Corrected disk array referencing in frontend to prevent "Failed to load system info" crash
- **Security Hardening** — Added `@require_auth` to `/nas/api/sysinfo` endpoint to prevent unauthorized access
- **Boundary Handling** — Fixed 500 error when requesting a file as a directory in `/nas/api/files`

### 📦 Version Bump
- Bumped all project version strings to `1.0.1`

---

## v1.0.0 (2026-07-11) — Initial Release

### 🚀 NAS Server (Web Frontend)
- **Dynamic root path** — Frontend fetches `ROOT_DIR` via `/nas/api/config` instead of hardcoding
- **Unified path handling** — Service startup (`__main__`) now goes through `init_app()` for consistent configuration
- **5-minute auto-login** — Password saved in `localStorage` with TTL; auto-authenticates on page refresh
- **Dynamic breadcrumb** — Shows actual root directory name, not hardcoded `/ home`
- **PDF zoom** — Zoom in/out buttons now actually resize the image display
- **Graceful shutdown** — Uses Werkzeug's built-in shutdown instead of `os._exit(0)`

### 🖥️ NAS Tool GUI (`nas_gui.exe`)
- **Subprocess isolation** — Flask server runs in `multiprocessing.Process` instead of `threading.Thread`
  - Pressing Stop Server no longer crashes the GUI window
  - Process cleanup: API shutdown → SIGTERM → SIGKILL (3-layer safety)
- **Configurable root path**, password, and port via GUI

### 🔧 Infrastructure
- **Environment variable support** — `NAS_ROOT_DIR`, `NAS_PASSWORD`, `NAS_PORT` for headless service startup
- **Config API** — `/nas/api/config` exposes current root path, version, and release date
- **Windows build** — PyInstaller spec and build script for `nas_gui.exe`

### ⚠️ Known Issues
- None at this time.

## v1.5.0 (2026-07-22) — Uiverse Galaxy UI Refresh

### ✨ New UI Components (from [Uiverse Galaxy](https://github.com/uiverse-io/galaxy))
- **Toast Notification System** — 17+ operation feedback points replaced `alert()` with elegant slide-in toasts (success/error/info/warning)
- **Dynamic Auth Background** — Animated grid pattern with dual-color glow effect on login page
- **WebDAV Toggle Switch** — Replaced clunky Start/Stop buttons with a smooth Uiverse-style toggle
- **Dual-ring Loading Spinner** — Fancier CSS-only spinner with counter-rotating rings

### 🐛 Bugfixes
- Fixed `checkAuth()` missing `initCharts()` call on manual login (CPU/Memory graphs were blank)
- Fixed `::before`/`::after` pseudo-elements covering auth form (added `pointer-events: none`)

### 🔧 Version
- Bumped to 1.5.0
- Release date: 2026-07-22
