#!/usr/bin/env python3
"""
Version Sync Script — Single source of truth: nas/unified_nexus.py

Reads __version__ and RELEASE_DATE from unified_nexus.py (canonical),
then syncs them to all other version-bearing files:

  - nas/__init__.py         (imports from unified_nexus — already auto)
  - README.md               (version badge on line 3)
  - nas_gui_version.txt     (Windows exe version metadata)
  - nas/frontend/…          (fetched at runtime via /api/config — auto)

Usage:
    python scripts/sync_version.py          # dry-run (print changes)
    python scripts/sync_version.py --write  # actually write files

Add this to your git hooks or release process.
"""

import re
import sys
import os

# Paths — relative to repo root (nas_tool/)
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CANONICAL = os.path.join(REPO, 'nas', 'unified_nexus.py')
README     = os.path.join(REPO, 'README.md')
GUI_TXT   = os.path.join(REPO, 'nas_gui_version.txt')


def read_canonical():
    """Parse __version__ and RELEASE_DATE from unified_nexus.py."""
    with open(CANONICAL) as f:
        text = f.read()

    m_v = re.search(r"__version__\s*=\s*'([^']+)'", text)
    m_d = re.search(r"RELEASE_DATE\s*=\s*'([^']+)'", text)
    if not m_v or not m_d:
        sys.exit("ERROR: cannot parse __version__ or RELEASE_DATE from " + CANONICAL)

    return m_v.group(1), m_d.group(1)


def parse_version_tuple(ver_str):
    """Convert '1.3.0' -> (1, 3, 0, 0)."""
    parts = ver_str.split('.')
    parts += ['0'] * (4 - len(parts))  # pad to 4
    return tuple(int(p) for p in parts[:4])


def sync_readme(version, date, dry_run=True):
    """Update the version badge in README.md (line containing '**Version X.Y.Z**')."""
    with open(README) as f:
        text = f.read()

    old_line = re.search(r'\*\*Version [\d.]+', text)
    if not old_line:
        print(f"  [SKIP] README: no version badge found")
        return

    new_text = re.sub(
        r'\*\*Version [\d.]+',
        f'**Version {version}',
        text
    )
    if new_text == text:
        print(f"  [OK]   README: already at {version}")
    elif dry_run:
        print(f"  [DRY]  README: {old_line.group()} -> **Version {version}**")
    else:
        with open(README, 'w') as f:
            f.write(new_text)
        print(f"  [DONE] README: -> **Version {version}**")


def sync_gui_txt(version, date, dry_run=True):
    """Update all version fields in nas_gui_version.txt."""
    with open(GUI_TXT) as f:
        text = f.read()

    vt = parse_version_tuple(version)
    orig = text

    # filevers / prodvers
    text = re.sub(
        r'(filevers\s*=\s*)\([\d,\s]+\)',
        rf'\1{vt}',
        text
    )
    text = re.sub(
        r'(prodvers\s*=\s*)\([\d,\s]+\)',
        rf'\1{vt}',
        text
    )

    # FileVersion string
    text = re.sub(
        r"(StringStruct\('FileVersion',\s*)'[^']*'",
        rf"\1'{version}'",
        text
    )
    # ProductVersion string
    text = re.sub(
        r"(StringStruct\('ProductVersion',\s*)'[^']*'",
        rf"\1'{version}'",
        text
    )
    # BuildDate
    text = re.sub(
        r"(StringStruct\('BuildDate',\s*)'[^']*'",
        rf"\1'{date}'",
        text
    )

    if text == orig:
        print(f"  [OK]   gui_txt: already up to date")
    elif dry_run:
        print(f"  [DRY]  gui_txt: would update version={version}, date={date}")
    else:
        with open(GUI_TXT, 'w') as f:
            f.write(text)
        print(f"  [DONE] gui_txt: version={version}, date={date}")


def main():
    dry_run = '--write' not in sys.argv

    version, date = read_canonical()
    print(f"Canonical version: {version}")
    print(f"Canonical date:    {date}")
    print(f"Mode:              {'DRY-RUN' if dry_run else 'WRITE'}")
    print()

    sync_readme(version, date, dry_run)
    sync_gui_txt(version, date, dry_run)

    print()
    if dry_run:
        print("Tip: run with --write to apply changes.")
    else:
        print("All files synced ✅")


if __name__ == '__main__':
    main()
