# -*- mode: python ; coding: utf-8 -*-


import os, glob


# Walk nas/ manually — compatible with all PyInstaller versions
_nas_datas = []
nas_dir = 'nas'
for dirpath, dirnames, filenames in os.walk(nas_dir):
    # Skip 81MB of dev-only node_modules
    dirnames[:] = [d for d in dirnames if d != 'node_modules']
    for fn in filenames:
        if fn.endswith('.pyc') or fn.endswith('.pyo'):
            continue
        src = os.path.join(dirpath, fn)
        dst = os.path.relpath(dirpath, nas_dir)
        _nas_datas.append((src, dst))


a = Analysis(
    ['nas_gui.py'],
    pathex=[],
    binaries=[],
    datas=_nas_datas,
    hiddenimports=['requests', 'flask', 'flask_cors', 'dotenv', 'psutil', 'PIL', 'nas.unified_nexus'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'test', 'unittest', 'setuptools', 'pip', 'distutils',
              'numpy', 'matplotlib', 'scipy', 'pandas', 'PIL.ImageShow',
              'PIL.ImageQt', 'PIL.ImageGrab', 'PIL.Features'],
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
