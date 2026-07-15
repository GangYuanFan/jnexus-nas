# J.NAS Release Notes

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
