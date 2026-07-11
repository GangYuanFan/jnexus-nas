# NAS package
# Version sourced from unified_nexus.py (the canonical definition)
from .unified_nexus import __version__, RELEASE_DATE
VERSION = __version__

# CHANGELOG:
# 1.0.0 (2026-07-11) - Initial release
# - Unified NAS root path handling (frontend dynamically fetches via /api/config)
# - Service startup goes through init_app() for consistent path management
# - NAS Tool GUI runs Flask server in subprocess (no more window crash on Stop)
# - PDF viewer zoom buttons now properly resize display
# - 5-minute auto-login via localStorage (persists across page refresh)
# - Breadcrumb shows actual root directory name
# - Graceful server shutdown via Werkzeug
