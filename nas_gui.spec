# -*- mode: python ; coding: utf-8 -*-


from PyInstaller.utils.hooks import Tree


# Pick only the runtime-essential files from nas/, skip 81MB node_modules
_nas_datas = list(Tree(
    'nas',
    excludes=[
        'frontend/node_modules',        # 81MB dev-only, NOT needed at runtime
        'frontend/node_modules/*',
        '__pycache__',
        '*.pyc',
        '.gitkeep',
    ],
))


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
