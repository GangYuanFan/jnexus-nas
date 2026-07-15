# NAS package
# Version sourced from unified_nexus.py (the canonical definition)
from .unified_nexus import __version__, RELEASE_DATE
VERSION = __version__

# CHANGELOG:
# 1.2.0 (2026-07-16) - Batch Share, Share Password Fix, Auto Cleanup
# - New: Batch share — multi-select files → share as ZIP bundle
# - Fix: Share password no longer overwritten by NAS master password
# - New: Automated expired share cleanup (symlinks + ZIP + metadata)
# - Fix: .shares/ folder now browsable despite broken symlinks
# - UX: Share dialog labels clarified to prevent password confusion
# - WebDAV: subprocess management in System page (Start/Stop)
# - Gallery: improved 600px thumbnails with play button for videos
# - Share UI: password form page for protected share links
#
# 1.1.0 (2026-07-15) - Resource Recycle Bin + Feature Release
# - New: Trash can system — deleted files/folders go to .trash directory
# - New: Trash UI in sidebar — list, restore, permanent delete, empty all
# - Files restore to original location with auto parent directory recreation
# - Filename conflict resolution with _restored_N suffix
# - Server config version bumped to 1.1.0
#
# 1.0.1 (2026-07-12) - Fix Monaco Editor, Path Fallback, and System Info UI
# - Unified NAS root path handling (frontend dynamically fetches via /api/config)
# - Service startup goes through init_app() for consistent path management
# - NAS Tool GUI runs Flask server in subprocess (no more window crash on Stop)
# - PDF viewer zoom buttons now properly resize display
# - 5-minute auto-login via localStorage (persists across page refresh)
# - Breadcrumb shows actual root directory name
# - Graceful server shutdown via Werkzeug
