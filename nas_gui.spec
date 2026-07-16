# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['nas_gui.py'],
    pathex=[],
    binaries=[],
    datas=[('nas', 'nas')],
    hiddenimports=['requests', 'flask', 'flask_cors', 'dotenv', 'psutil', 'PIL', 'nas.unified_nexus'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='nas_gui',
    version='nas_gui_version.txt',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
