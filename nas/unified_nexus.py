import requests
import logging
from flask import Flask, jsonify, request, send_file, send_from_directory, Blueprint, redirect, Response
from flask_cors import CORS
from dotenv import load_dotenv
# Version — defined here for direct script execution support
__version__ = '1.0.0'
RELEASE_DATE = '2026-07-11'
import psutil
import platform
import time
import os
import sys
import io
import threading
import glob
import subprocess
from pathlib import Path
from functools import wraps

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s', 
                    stream=sys.stdout)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)
CORS(app)
app.json.sort_keys = False

# --- CONFIG ---
ROOT_DIR = '/home/jerry/workspace'
NAS_PASSWORD = 'JERRY_NEXUS_2026'

def init_app(root, password, port):
    global ROOT_DIR, NAS_PASSWORD
    ROOT_DIR = os.path.abspath(root)
    NAS_PASSWORD = password
    logger.info(f'NAS App initialized with absolute root={ROOT_DIR}, port={port}')

def resolve_path(path):
    logger.info(f'[PATH-DEBUG] Input path: "{path}", Current ROOT_DIR: "{ROOT_DIR}"')
    if not path:
        res = ROOT_DIR
    elif os.path.isabs(path) and path.startswith(ROOT_DIR):
        res = os.path.normpath(path)
    else:
        # Handle potential Windows-style absolute paths from GUI
        clean_path = path
        if ':' in path:
            parts = path.split(':', 1)
            if len(parts) == 2:
                clean_path = parts[1].lstrip('\\/')
        
        res = os.path.normpath(os.path.join(ROOT_DIR, clean_path.lstrip('/')))
    logger.info(f'[PATH-DEBUG] Resolved to: "{res}"')
    return res

# Image/Video extensions for thumbnails
IMG_EXTS = {'.jpg','.jpeg','.png','.gif','.webp'}
VID_EXTS = {'.mp4','.mov','.avi','.mkv','.webm'}
DOC_EXTS = '.doc,.docx,.xls,.xlsx,.ppt,.pptx'.split(',')

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        provided_pw = request.args.get('password')
        if not provided_pw and request.is_json:
            provided_pw = request.json.get('password')
            
        if provided_pw != NAS_PASSWORD:
            return jsonify({"error": "Invalid or missing password"}), 401
        return f(*args, **kwargs)
    return decorated_function

# --- NAS BLUEPRINT (Handles /nas prefix) ---
nas_bp = Blueprint('nas', __name__, url_prefix='/nas')

@nas_bp.route('/api/auth', methods=['POST'])
def verify_auth():
    data = request.json
    pw = data.get('password', '')
    if pw == NAS_PASSWORD:
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Invalid password"}), 401

@nas_bp.route('/')
def serve_nas_index():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    return send_from_directory(current_dir, 'index.html')

@nas_bp.route('/api/config')
def nas_config():
    """Return current NAS root path config."""
    return jsonify({
        'root': ROOT_DIR,
        'version': __version__,
        'release_date': RELEASE_DATE
    })

@nas_bp.route('/api/sysinfo')
def system_info():
    cpu_percent = psutil.cpu_percent(interval=0.1)
    cpu_count = psutil.cpu_count()
    mem = psutil.virtual_memory()
    
    # 1. 儲存拓樸掃描 (使用 glob.glob 以相容 WSL)
    disks = []
    import glob, os
    try:
        # We search /mnt/* and check if they are directories
        for path in sorted(glob.glob('/mnt/*')):
            if os.path.isdir(path):
                try:
                    usage = psutil.disk_usage(path)
                    label = path.split('/')[-1].upper()
                    disks.append({
                        'mount': path, 'label': label,
                        'total_gb': usage.total / 1024**3, 'used_gb': usage.used / 1024**3, 'percent': usage.percent
                    })
                except: pass
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f'Error scanning disks: {e}')

    # 2. 其他監控
    net = psutil.net_io_counters()
    boot_time = psutil.boot_time()
    uptime_seconds = time.time() - boot_time
    uptime_human = f'{int(uptime_seconds // 86400)}d {int((uptime_seconds % 86400) // 3600)}h {int((uptime_seconds % 3600) // 60)}m'
    
    return jsonify({
        'cpu_percent': cpu_percent, 'cpu_count': cpu_count,
        'platform': platform.platform(), 'hostname': platform.node(),
        'memory': {'total_gb': mem.total / 1024**3, 'used_gb': (mem.total - mem.available) / 1024**3, 'percent': mem.percent},
        'disks': disks,
        'network': {'bytes_sent': net.bytes_sent, 'bytes_recv': net.bytes_recv},
        'uptime_human': uptime_human
    })
@nas_bp.route('/api/read')
@require_auth
def read_file():
    path = request.args.get('path', '')
    full_path = resolve_path(path)
    if not full_path.startswith(ROOT_DIR): return jsonify({"error": "Forbidden"}), 403
    try:
        with open(full_path, 'r', encoding='utf-8') as f: return f.read()
    except Exception as e: return jsonify({"error": str(e)}), 500

@nas_bp.route('/api/save', methods=['POST'])
@require_auth
def save_file():
    data = request.json
    path = data['path']
    full_path = resolve_path(path)
    if not full_path.startswith(ROOT_DIR): return jsonify({"error": "Forbidden"}), 403
    try:
        content = data['content']
        is_binary = data.get('binary', False)
        if is_binary:
            import base64
            with open(full_path, 'wb') as f: f.write(base64.b64decode(content))
        else:
            with open(full_path, 'w', encoding='utf-8') as f: f.write(content)
        return jsonify({"success": True})
    except Exception as e: return jsonify({"error": str(e)}), 500

@nas_bp.route('/api/files')
@require_auth
def list_files():
    path = request.args.get('path', '')
    full_path = resolve_path(path)
    if not full_path.startswith(ROOT_DIR): return jsonify({"error": "Forbidden"}), 403
    try:
        files = []
        for entry in os.scandir(full_path):
            files.append({
                "name": entry.name, "is_dir": entry.is_dir(),
                "size": entry.stat().st_size if not entry.is_dir() else None,
                "mtime": entry.stat().st_mtime
            })
        return jsonify(files)
    except Exception as e: return jsonify({"error": str(e)}), 500

@nas_bp.route('/api/mkdir', methods=['POST'])
@require_auth
def make_dir():
    data = request.json
    path = data['path']
    full_dir = resolve_path(path)
    full_path = os.path.join(full_dir, data['name'])
    try:
        os.makedirs(full_path, exist_ok=True)
        return jsonify({"success": True})
    except Exception as e: return jsonify({"error": str(e)}), 500

@nas_bp.route('/api/upload', methods=['POST'])
@require_auth
def upload_file():
    file = request.files['file']
    path = request.form.get('path', '')
    full_dir = resolve_path(path)
    full_path = os.path.join(full_dir, file.filename)
    try:
        file.save(full_path)
        return jsonify({"success": True})
    except Exception as e: return jsonify({"error": str(e)}), 500

@nas_bp.route('/api/delete', methods=['POST'])
@require_auth
def delete_item():
    path = request.json.get('path', '')
    full_path = resolve_path(path)
    if not full_path.startswith(ROOT_DIR): return jsonify({"error": "Forbidden"}), 403
    try:
        if os.path.isdir(full_path): import shutil; shutil.rmtree(full_path)
        else: os.remove(full_path)
        return jsonify({"success": True})
    except Exception as e: return jsonify({"error": str(e)}), 500

@nas_bp.route('/api/rename', methods=['POST'])
@require_auth
def rename_item():
    data = request.json
    old_p = data['oldPath']
    new_p = data['newName']
    old_full = resolve_path(old_p)
    if not old_full.startswith(ROOT_DIR): return jsonify({"error": "Forbidden"}), 403
    new_full = os.path.join(os.path.dirname(old_full), new_p)
    try:
        os.rename(old_full, new_full)
        return jsonify({"success": True})
    except Exception as e: return jsonify({"error": str(e)}), 500

@nas_bp.route('/api/download')
@require_auth
def download_file():
    path = request.args.get('path', '')
    full_path = resolve_path(path)
    if not full_path.startswith(ROOT_DIR): return jsonify({"error": "Forbidden"}), 403
    return send_from_directory(os.path.dirname(full_path), os.path.basename(full_path), as_attachment=True)

@nas_bp.route('/api/shutdown', methods=['POST'])
def shutdown_server():
    logging.getLogger(__name__).info('Shutdown request received. Shutting down server...')
    
    # Use Werkzeug's built-in shutdown mechanism instead of os._exit(0)
    # which kills the entire Python process (including the GUI).
    func = request.environ.get('werkzeug.server.shutdown')
    if func:
        func()
        return jsonify({"success": True, "message": "Server shutting down..."})
    else:
        # Fallback: use os._exit only if Werkzeug shutdown is unavailable
        def exit_process():
            time.sleep(1)
            os._exit(0)
        threading.Thread(target=exit_process).start()
        return jsonify({"success": True, "message": "Server shutting down (emergency)..."})

@nas_bp.route('/api/view')
@require_auth
def view_file():
    path = request.args.get('path', '')
    full_path = resolve_path(path)
    if not full_path.startswith(ROOT_DIR): return jsonify({"error": "Forbidden"}), 403
    return send_from_directory(os.path.dirname(full_path), os.path.basename(full_path), as_attachment=False)

# ====== DOCUMENT READ/WRITE APIs ======

@nas_bp.route('/api/read_doc')
@require_auth
def read_document():
    """Read Office/PDF document, return structured JSON for frontend card."""
    path = request.args.get('path', '')
    full_path = resolve_path(path)
    if not full_path.startswith(ROOT_DIR):
        return jsonify({"error": "Forbidden"}), 403

    ext = os.path.splitext(full_path)[1].lower()

    try:
        if ext == '.docx':
            from docx import Document
            doc = Document(full_path)
            paragraphs = []
            for p in doc.paragraphs:
                if p.text.strip():
                    paragraphs.append({
                        "text": p.text,
                        "style": p.style.name if p.style else "Normal"
                    })
            return jsonify({
                "type": "word",
                "content": paragraphs,
                "filepath": path,
                "filename": os.path.basename(full_path)
            })

        elif ext in ('.xls', '.xlsx'):
            import openpyxl
            wb = openpyxl.load_workbook(full_path, data_only=True)
            sheets = {}
            for sheet_name in wb.sheetnames:
                ws = wb[sheet_name]
                data = []
                for row in ws.iter_rows(values_only=True):
                    data.append([str(c) if c is not None else "" for c in row])
                sheets[sheet_name] = data
            wb.close()
            return jsonify({
                "type": "excel",
                "sheets": sheets,
                "activeSheet": wb.sheetnames[0] if wb.sheetnames else "",
                "sheetNames": wb.sheetnames,
                "filepath": path,
                "filename": os.path.basename(full_path)
            })

        elif ext == '.pptx':
            from pptx import Presentation
            prs = Presentation(full_path)
            slides = []
            for slide in prs.slides:
                texts = []
                for shape in slide.shapes:
                    if shape.has_text_frame:
                        for p in shape.text_frame.paragraphs:
                            t = p.text.strip()
                            if t:
                                texts.append(t)
                slides.append({"texts": texts})
            return jsonify({
                "type": "powerpoint",
                "slides": slides,
                "slideCount": len(slides),
                "filepath": path,
                "filename": os.path.basename(full_path)
            })

        elif ext == '.pdf':
            import pypdf
            reader = pypdf.PdfReader(full_path)
            pages = []
            for page in reader.pages:
                pages.append(page.extract_text())
            return jsonify({
                "type": "pdf",
                "pages": pages,
                "pageCount": len(pages),
                "filepath": path,
                "filename": os.path.basename(full_path)
            })

        return jsonify({"error": f"Unsupported: {ext}"}), 400

    except Exception as e:
        logger.error(f"read_doc error: {e}")
        return jsonify({"error": str(e)}), 500


@nas_bp.route('/api/pdf_page')
@require_auth
def pdf_page_image():
    """Render one PDF page as JPEG image using pypdfium2."""
    path = request.args.get('path', '')
    page_num = int(request.args.get('page', 0))
    scale = float(request.args.get('scale', '1.5'))

    full_path = resolve_path(path)
    if not full_path.startswith(ROOT_DIR):
        return jsonify({"error": "Forbidden"}), 403

    try:
        import pypdfium2 as pdfium
        pdf = pdfium.PdfDocument(full_path)
        if page_num >= len(pdf):
            return jsonify({"error": "Page not found"}), 404

        page = pdf[page_num]
        bitmap = page.render(scale=scale)
        pil_image = bitmap.to_pil()
        img_io = io.BytesIO()
        pil_image.save(img_io, 'JPEG', quality=92)
        img_io.seek(0)
        return send_file(img_io, mimetype='image/jpeg')
    except Exception as e:
        logger.error(f"pdf_page error: {e}")
        return jsonify({"error": str(e)}), 500


@nas_bp.route('/api/save_doc', methods=['POST'])
@require_auth
def save_document():
    """Save document from JSON payload (round-trip editing)."""
    data = request.json
    path = data.get('path', '')
    full_path = resolve_path(path)
    if not full_path.startswith(ROOT_DIR):
        return jsonify({"error": "Forbidden"}), 403

    ext = os.path.splitext(full_path)[1].lower()

    try:
        if ext == '.docx':
            from docx import Document
            doc = Document()
            for para in data.get('content', []):
                if isinstance(para, dict):
                    doc.add_paragraph(para.get('text', ''))
                else:
                    doc.add_paragraph(str(para))
            doc.save(full_path)
            return jsonify({"success": True})

        elif ext in ('.xls', '.xlsx'):
            import openpyxl
            wb = openpyxl.Workbook()
            wb.remove(wb.active)
            sheets_data = data.get('sheets', {})
            for sheet_name, rows in sheets_data.items():
                ws = wb.create_sheet(title=sheet_name[:31])  # Excel sheet name limit
                for row in rows:
                    ws.append(row)
            wb.save(full_path)
            return jsonify({"success": True})

        elif ext == '.pptx':
            from pptx import Presentation
            from pptx.util import Inches
            prs = Presentation()
            for slide_data in data.get('slides', []):
                slide_layout = prs.slide_layouts[6]  # blank
                slide = prs.slides.add_slide(slide_layout)
                for text in slide_data.get('texts', []):
                    txBox = slide.shapes.add_textbox(Inches(0.5), Inches(0.5), Inches(9), Inches(0.5))
                    tf = txBox.text_frame
                    tf.text = text
            prs.save(full_path)
            return jsonify({"success": True})

        return jsonify({"error": f"Unsupported: {ext}"}), 400

    except Exception as e:
        logger.error(f"save_doc error: {e}")
        return jsonify({"error": str(e)}), 500


@nas_bp.route('/api/thumbnail')
def get_thumbnail():
    path = request.args.get('path', '')
    full_path = resolve_path(path)
    if not full_path.startswith(ROOT_DIR):
        return redirect('https://cdn-icons-png.flaticon.com/512/2961222.png', code=302)
    
    ext = os.path.splitext(full_path)[1].lower()
    
    try:
        # 1. Image Thumbnails (Pure Memory)
        if ext in IMG_EXTS:
            from PIL import Image, ImageOps
            img = Image.open(full_path)
            img = ImageOps.exif_transpose(img)
            img.thumbnail((200, 200), Image.LANCZOS)
            if img.mode in ('RGBA', 'LA', 'P'):
                bg = Image.new('RGB', img.size, (30, 30, 40))
                if img.mode == 'RGBA':
                    bg.paste(img, mask=img.split()[3])
                else:
                    bg.paste(img)
                img = bg
            
            img_io = io.BytesIO()
            img.save(img_io, 'JPEG', quality=85)
            img_io.seek(0)
            return send_file(img_io, mimetype='image/jpeg')

        # 2. Video Thumbnails (Pure Memory via Pipe)
        if ext in VID_EXTS:
            import subprocess
            ffmpeg_bin = '/home/linuxbrew/.linuxbrew/bin/ffmpeg'
            try:
                for timestamp in ['00:00:01', '00:00:00']:
                    cmd = [
                        ffmpeg_bin, '-loglevel', 'error', '-ss', timestamp, 
                        '-i', full_path, '-vframes', '1', '-f', 'image2pipe', 
                        '-vcodec', 'mjpeg', '-vf', 'scale=200:-1', '-'
                    ]
                    result = subprocess.run(cmd, capture_output=True, timeout=10)
                    if result.returncode == 0 and result.stdout:
                        return Response(result.stdout, mimetype='image/jpeg')
            except Exception as ve:
                logger.error(f"Video pipe error: {ve}")

    except Exception as e:
        logger.error(f"General thumb error: {e}")
        pass

    # 3. Special Document Icons
    icon_paths = {
        '.doc': ('nas_tool/nas/icons/word---67ab8593-d97f-4d34-bea6-25bc16087a34.png', 'https://cdn-icons-png.flaticon.com/512/732220.png'),
        '.docx': ('nas_tool/nas/icons/word---67ab8593-d97f-4d34-bea6-25bc16087a34.png', 'https://cdn-icons-png.flaticon.com/512/732220.png'),
        '.xls': ('nas_tool/nas/icons/logo---fbd73b10-ff25-4e86-b0f0-ac7a0ae3d93c.png', 'https://cdn-icons-png.flaticon.com/512/732222.png'),
        '.xlsx': ('nas_tool/nas/icons/logo---fbd73b10-ff25-4e86-b0f0-ac7a0ae3d93c.png', 'https://cdn-icons-png.flaticon.com/512/732222.png'),
        '.ppt': ('nas_tool/nas/icons/logo---0a771b7b-b41e-4235-bf90-003e8c46e5a6.png', 'https://cdn-icons-png.flaticon.com/512/732225.png'),
        '.pptx': ('nas_tool/nas/icons/logo---0a771b7b-b41e-4235-bf90-003e8c46e5a6.png', 'https://cdn-icons-png.flaticon.com/512/732225.png'),
    }
    if ext in icon_paths:
        custom_path, fallback_url = icon_paths[ext]
        full_custom = os.path.join(ROOT_DIR, custom_path)
        if os.path.exists(full_custom):
            return send_file(full_custom, mimetype='image/png')
        return redirect(fallback_url, code=302)

    # 4. Generic Fallback Icons
    icon_map = {
        'jpg':'337943','jpeg':'337943','png':'337943','gif':'337943','webp':'337943','svg':'337943',
        'mp4':'1179067','mov':'1179067','avi':'1179067','mkv':'1179067','webm':'1179067',
        'mp3':'461261','wav':'461261','m4a':'461261','aac':'461261','flac':'461261',
        'pdf':'337946',
        'doc':'https://cdn-icons-png.flaticon.com/512/732/732220.png',
        'docx':'https://cdn-icons-png.flaticon.com/512/732/732220.png',
        'xls':'https://cdn-icons-png.flaticon.com/512/732/732222.png',
        'xlsx':'https://cdn-icons-png.flaticon.com/512/732/732222.png',
        'ppt':'https://cdn-icons-png.flaticon.com/512/732/732225.png',
        'pptx':'https://cdn-icons-png.flaticon.com/512/732/732225.png',
        'py':'1055644','js':'1055644','html':'1055644','css':'1055644','json':'1055644',
        'md':'1055644','txt':'1055644','log':'1055644','sh':'1055644',
        'zip':'2961218','tar':'2961218','gz':'2961218','rar':'2961218'
    }
    
    icon_val = icon_map.get(ext[1:] if ext.startswith('.') else ext, '2961222')
    if icon_val.startswith('http'):
        return redirect(icon_val, code=302)
    return redirect(f'https://cdn-icons-png.flaticon.com/512/{icon_val}.png', code=302)

@nas_bp.route('/manifest.json')
def pwa_manifest():
    return send_from_directory(os.path.dirname(os.path.abspath(__file__)), 'manifest.json')

@nas_bp.route('/sw.js')
def pwa_sw():
    return send_from_directory(os.path.dirname(os.path.abspath(__file__)), 'sw.js')

app.register_blueprint(nas_bp)

@app.route('/')
@app.route('/nas')
def redirect_to_nas():
    return redirect('/nas/', code=301)

if __name__ == '__main__':
    # When run directly (e.g. via jnexus.service), go through init_app()
    # so the root path is handled consistently. Override via env vars.
    root = os.environ.get('NAS_ROOT_DIR', '/home/jerry/workspace')
    password = os.environ.get('NAS_PASSWORD', 'JERRY_NEXUS_2026')
    port = int(os.environ.get('NAS_PORT', '8000'))
    init_app(root, password, port)
    app.run(host='0.0.0.0', port=port)
