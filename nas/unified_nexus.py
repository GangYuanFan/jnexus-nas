import logging
import argparse
import sys
import os
import requests
from flask import Flask, jsonify, request, send_file, send_from_directory, Blueprint, redirect
from flask_cors import CORS
from dotenv import load_dotenv
import psutil
import platform
import time
from pathlib import Path

# Setup logging
logging.basicConfig(
    filename='nas_server_debug.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    encoding='utf-8'
)

load_dotenv()

app = Flask(__name__)
CORS(app)
app.json.sort_keys = False

# --- GLOBAL CONFIG ---
ROOT_DIR = '/tmp' 
THUMB_DIR = '/tmp/nas_thumbnails'
NAS_PASSWORD = 'JERRY_NEXUS_2026'

# Image/Video extensions for thumbnails
IMG_EXTS = {'.jpg','.jpeg','.png','.gif','.webp'}
VID_EXTS = {'.mp4','.mov','.avi','.mkv','.webm'}

def init_app(root, password, port):
    \"\"\"Initialize server configuration from GUI arguments.\"\"\"
    global ROOT_DIR, THUMB_DIR, NAS_PASSWORD
    ROOT_DIR = os.path.abspath(root)
    NAS_PASSWORD = password
    THUMB_DIR = os.path.join(os.environ.get('TEMP', '/tmp'), 'nas_thumbnails')
    os.makedirs(THUMB_DIR, exist_ok=True)
    logging.info(f"Server initialized: ROOT={ROOT_DIR}, PASS={NAS_PASSWORD}, PORT={port}")

# --- NAS BLUEPRINT ---
nas_bp = Blueprint('nas', __name__, url_prefix='/nas')

# Simple password verification helper
def verify_password():
    auth_pass = request.args.get('pwd') or request.headers.get('X-NAS-Password')
    if auth_pass != NAS_PASSWORD:
        return False
    return True

@nas_bp.before_request
def check_auth():
    # Allow access to index.html without password, but protect all API calls
    if request.endpoint and request.endpoint.startswith('api_'):
        if not verify_password():
            return jsonify({"error": "Invalid Password"}), 403

@nas_bp.route('/')
def serve_nas_index():
    if getattr(sys, 'frozen', False):
        frontend_path = os.path.join(sys._MEIPASS, 'nas')
    else:
        frontend_path = os.path.dirname(os.path.abspath(__file__))
    return send_from_directory(frontend_path, 'index.html')

@nas_bp.route('/api/root')
def get_root():
    return jsonify({"root": ROOT_DIR})

@nas_bp.route('/api/sysinfo')
def api_sysinfo():
    cpu_percent = psutil.cpu_percent(interval=0.5)
    cpu_count = psutil.cpu_count()
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    boot_time = psutil.boot_time()
    uptime_seconds = time.time() - boot_time
    uptime_human = f"{int(uptime_seconds // 86400)}d {int((uptime_seconds % 86400) // 3600)}h {int((uptime_seconds % 3600) // 60)}m"
    return jsonify({
        "cpu_percent": cpu_percent, "cpu_count": cpu_count,
        "platform": platform.platform(), "hostname": platform.node(),
        "memory": {"total_gb": mem.total / 1024**3, "used_gb": (mem.total - mem.available) / 1024**3, "percent": mem.percent},
        "disk": {"total_gb": disk.total / 1024**3, "used_gb": disk.used / 1024**3, "percent": disk.percent},
        "uptime_human": uptime_human
    })

@nas_bp.route('/api/read')
def api_read():
    path = request.args.get('path', '')
    if path.startswith('/'): path = path.lstrip('/')
    full_path = os.path.normpath(os.path.join(ROOT_DIR, path))
    if not full_path.startswith(ROOT_DIR): return jsonify({"error": "Forbidden"}), 403
    try:
        with open(full_path, 'r', encoding='utf-8') as f: return f.read()
    except Exception as e: return jsonify({"error": str(e)}), 500

@nas_bp.route('/api/save', methods=['POST'])
def api_save():
    data = request.json
    path = data['path']
    if path.startswith('/'): path = path.lstrip('/')
    full_path = os.path.normpath(os.path.join(ROOT_DIR, path))
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
def api_files():
    path = request.args.get('path', '')
    if path.startswith('/'): path = path.lstrip('/')
    full_path = os.path.normpath(os.path.join(ROOT_DIR, path))
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
def api_mkdir():
    data = request.json
    path = data['path']
    if path.startswith('/'): path = path.lstrip('/')
    full_dir = os.path.normpath(os.path.join(ROOT_DIR, path))
    full_path = os.path.join(full_dir, data['name'])
    try:
        os.makedirs(full_path, exist_ok=True)
        return jsonify({"success": True})
    except Exception as e: return jsonify({"error": str(e)}), 500

@nas_bp.route('/api/upload', methods=['POST'])
def api_upload():
    file = request.files['file']
    path = request.form.get('path', '')
    if path.startswith('/'): path = path.lstrip('/')
    full_dir = os.path.normpath(os.path.join(ROOT_DIR, path))
    full_path = os.path.join(full_dir, file.filename)
    try:
        file.save(full_path)
        return jsonify({"success": True})
    except Exception as e: return jsonify({"error": str(e)}), 500

@nas_bp.route('/api/delete', methods=['POST'])
def api_delete():
    path = request.json.get('path', '')
    if path.startswith('/'): path = path.lstrip('/')
    full_path = os.path.normpath(os.path.join(ROOT_DIR, path))
    if not full_path.startswith(ROOT_DIR): return jsonify({"error": "Forbidden"}), 403
    try:
        if os.path.isdir(full_path): import shutil; shutil.rmtree(full_path)
        else: os.remove(full_path)
        return jsonify({"success": True})
    except Exception as e: return jsonify({"error": str(e)}), 500

@nas_bp.route('/api/rename', methods=['POST'])
def api_rename():
    data = request.json
    old_p = data['oldPath']
    if old_p.startswith('/'): old_p = old_p.lstrip('/')
    new_p = data['newName']
    
    old_full = os.path.normpath(os.path.join(ROOT_DIR, old_p))
    if not old_full.startswith(ROOT_DIR): return jsonify({"error": "Forbidden"}), 403
    
    new_full = os.path.join(os.path.dirname(old_full), new_p)
    try:
        os.rename(old_full, new_full)
        return jsonify({"success": True})
    except Exception as e: return jsonify({"error": str(e)}), 500

@nas_bp.route('/api/download')
def api_download():
    path = request.args.get('path', '')
    if path.startswith('/'): path = path.lstrip('/')
    full_path = os.path.normpath(os.path.join(ROOT_DIR, path))
    if not full_path.startswith(ROOT_DIR): return jsonify({"error": "Forbidden"}), 403
    return send_from_directory(os.path.dirname(full_path), os.path.basename(full_path), as_attachment=True)

@nas_bp.route('/api/view')
def api_view():
    path = request.args.get('path', '')
    if path.startswith('/'): path = path.lstrip('/')
    full_path = os.path.normpath(os.path.join(ROOT_DIR, path))
    if not full_path.startswith(ROOT_DIR): return jsonify({"error": "Forbidden"}), 403
    return send_from_directory(os.path.dirname(full_path), os.path.basename(full_path), as_attachment=False)

@nas_bp.route('/api/thumbnail')
def api_thumbnail():
    path = request.args.get('path', '')
    if path.startswith('/'): path = path.lstrip('/')
    full_path = os.path.normpath(os.path.join(ROOT_DIR, path))
    if not full_path.startswith(ROOT_DIR):
        return redirect('https://cdn-icons-png.flaticon.com/512/2961/2961222.png', code=302)
    ext = os.path.splitext(full_path)[1].lower()
    cache_key = path.replace('/', '_').replace(' ', '_')
    thumb_path = os.path.join(THUMB_DIR, cache_key + '.jpg')
    if os.path.exists(thumb_path):
        src_mtime = os.path.getmtime(full_path) if os.path.exists(full_path) else 0
        thumb_mtime = os.path.getmtime(thumb_path)
        if thumb_mtime >= src_mtime:
            return send_file(thumb_path, mimetype='image/jpeg')
    try:
        if ext in IMG_EXTS:
            from PIL import Image, ImageOps
            img = Image.open(full_path)
            img = ImageOps.exif_transpose(img) or img
            img.thumbnail((200, 200), Image.LANCZOS)
            if img.mode in ('RGBA', 'LA', 'P'):
                bg = Image.new('RGB', img.size, (30, 30, 40))
                if img.mode == 'RGBA':
                    bg.paste(img, mask=img.split()[3])
                else:
                    bg.paste(img)
                img = bg
            img.save(thumb_path, 'JPEG', quality=75)
            return send_file(thumb_path, mimetype='image/jpeg')
        if ext in VID_EXTS:
            import subprocess
            try:
                result = subprocess.run(
                    ['ffmpeg', '-i', full_path, '-ss', '00:00:01', '-vframes', '1',
                     '-vf', 'scale=200:-1', '-q:v', '5', '-y', thumb_path],
                    capture_output=True, timeout=30
                )
            except subprocess.TimeoutExpired:
                result = None
            if result and result.returncode == 0 and os.path.exists(thumb_path):
                return send_file(thumb_path, mimetype='image/jpeg')
            # Fallback: try with first frame
            try:
                result2 = subprocess.run(
                    ['ffmpeg', '-i', full_path, '-ss', '00:00:00', '-vframes', '1',
                     '-vf', 'scale=200:-1', '-q:v', '5', '-y', thumb_path],
                    capture_output=True, timeout=30
                )
                if result2.returncode == 0 and os.path.exists(thumb_path):
                    return send_file(thumb_path, mimetype='image/jpeg')
            except:
                pass
    except Exception:
        pass
    icon_map = {'jpg':'337943','jpeg':'337943','png':'337943','gif':'337943','webp':'337943','svg':'337943','mp4':'1179067','mov':'1179067','avi':'1179067','mkv':'1179067','webm':'1179067','mp3':'461261','wav':'461261','m4a':'461261','aac':'461261','flac':'461261','pdf':'337946','doc':'732220','docx':'732220','xls':'732222','xlsx':'732222','ppt':'732225','pptx':'732225','py':'1055644','js':'1055644','html':'1055644','css':'1055644','json':'1055644','md':'1055644','txt':'1055644','log':'1055644','sh':'1055644','zip':'2961218','tar':'2961218','gz':'2961218','rar':'2961218'}
    icon_id = icon_map.get(ext[1:] if ext.startswith('.') else ext, '2961222')
    return redirect(f'https://cdn-icons-png.flaticon.com/512/{icon_id}.png', code=302)

app.register_blueprint(nas_bp)

@app.route('/')
@app.route('/nas')
def redirect_to_nas():
    return redirect('/nas/', code=301)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='/home/jerry/workspace')
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--password', default='JERRY_NEXUS_2026')
    args = parser.parse_args()
    
    init_app(args.root, args.password, args.port)
    app.run(host='0.0.0.0', port=args.port)
