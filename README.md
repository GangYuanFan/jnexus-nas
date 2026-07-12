# J.NAS — Network Attached Storage System

**Version 1.0.1** | A lightweight, browser-based NAS management tool with a desktop GUI controller.

![Dashboard Screenshot](https://img.shields.io/badge/status-stable-brightgreen)

---

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [NAS Server (Web)](#-nas-server-web)
  - [Quick Start](#quick-start)
  - [Configuration](#configuration)
  - [API Endpoints](#api-endpoints)
- [NAS Tool GUI (Desktop)](#-nas-tool-gui-desktop)
  - [Installation](#installation-windows)
  - [How to Use](#how-to-use)
  - [Settings Reference](#settings-reference)
- [Remote Access with Tailscale](#-remote-access-with-tailscale)
  - [What is Tailscale?](#what-is-tailscale)
  - [Setup Guide](#setup-guide)
  - [Connecting to NAS via Tailscale](#connecting-to-nas-via-tailscale)
- [Development](#-development)
- [Build from Source](#-build-from-source)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Client Browser                     │
│  (http://<server-ip>:<port>/nas/)                    │
└────────────────────────┬────────────────────────────┘
                         │ HTTP / WebSocket
┌────────────────────────▼────────────────────────────┐
│              Flask Web Server (Python)               │
│  - File browsing, editing, upload/download           │
│  - PDF / Word / Excel / PPT viewer                   │
│  - Media player (image, video)                       │
│  - Code editor (Monaco)                              │
│  - System dashboard (CPU, memory, disk)              │
└────────────────────────┬────────────────────────────┘
                         │ localhost API
┌────────────────────────▼────────────────────────────┐
│          Desktop GUI Controller (PySide6)            │
│  - Start / Stop server button                       │
│  - Configure root path, password, port               │
└─────────────────────────────────────────────────────┘
```

---

## 🌐 NAS Server (Web)

### Quick Start

**Option A — Via GUI (Windows):**
1. Open `nas_gui.exe`
2. Set **Root Directory** to the folder you want to serve
3. Set your **NAS Password**
4. Set **Server Port** (default: 8000)
5. Click **Start Server**
6. Open browser to `http://localhost:<port>/nas/`

**Option B — Via command line (Linux/WSL):**
```bash
cd nas_tool/nas
NAS_ROOT_DIR=/path/to/root NAS_PASSWORD=your_password NAS_PORT=7500 python unified_nexus.py
```

**Option C — Via systemd service (Linux):**
```bash
sudo systemctl start jnexus.service
```

### Configuration

| Parameter       | Env Variable        | Default                     | Description                      |
|-----------------|---------------------|-----------------------------|----------------------------------|
| Root directory  | `NAS_ROOT_DIR`      | `/home/jerry/workspace`     | Base path for file browsing      |
| Password        | `NAS_PASSWORD`      | `JERRY_NEXUS_2026`          | Access key for authentication    |
| Port            | `NAS_PORT`          | `8000`                      | HTTP server port                 |

### Auto-Login

Once authenticated, the NAS remembers your session for **5 minutes** via `localStorage`. Refresh the page within that window and you'll be logged in automatically — no flash, no re-entry.

### API Endpoints

| Endpoint               | Method | Auth | Description                    |
|------------------------|--------|------|--------------------------------|
| `/nas/`                | GET    | No   | Web UI (HTML)                  |
| `/nas/api/config`      | GET    | No   | Server config (root, version)  |
| `/nas/api/auth`        | POST   | No   | Authenticate with password     |
| `/nas/api/files`       | GET    | Yes  | List files in a directory      |
| `/nas/api/read`        | GET    | Yes  | Read file content              |
| `/nas/api/save`        | POST   | Yes  | Save file content              |
| `/nas/api/upload`      | POST   | Yes  | Upload files (multipart)       |
| `/nas/api/delete`      | POST   | Yes  | Delete file/folder             |
| `/nas/api/rename`      | POST   | Yes  | Rename file/folder             |
| `/nas/api/mkdir`       | POST   | Yes  | Create directory               |
| `/nas/api/download`    | GET    | Yes  | Download file                  |
| `/nas/api/view`        | GET    | Yes  | View file (inline)             |
| `/nas/api/thumbnail`   | GET    | No   | File thumbnail/image           |
| `/nas/api/sysinfo`     | GET    | No   | System information             |
| `/nas/api/read_doc`    | GET    | Yes  | Read document (PDF/Word/Excel) |
| `/nas/api/pdf_page`    | GET    | Yes  | Render PDF page as image       |
| `/nas/api/save_doc`    | POST   | Yes  | Save edited document           |
| `/nas/api/shutdown`    | POST   | No   | Gracefully stop the server     |

---

## 🖥️ NAS Tool GUI (Desktop)

### Installation (Windows)

**Step 1 — Build the executable**

You need to compile the GUI before first use:
```bash
cd D:\nas_tool
build_windows.bat
```
This will:
- Install all Python dependencies
- Compile `nas_gui.exe` using PyInstaller
- Output to `dist/nas_gui.exe` (~69 MB)

**Step 2 — Run**
1. Open `dist/nas_gui.exe`
2. No installation needed — double-click to run

### How to Use

1. **Launch** `nas_gui.exe` — a small controller window appears

   ![GUI Window Layout]
   ```
   ┌───────────────────────────────────────┐
   │  J.NAS Server Controller v1.0.1       │
   ├───────────────────────────────────────┤
   │  Root Directory: [________________] Browse │
   │  NAS Password:   [________________]        │
   │  Server Port:    [________________]        │
   │                                           │
   │  [🟢 Start Server]   [🔴 Stop Server]      │
   │                                           │
   │  [Open NAS Interface]                     │
   │                                           │
   │  Status: Stopped                          │
   └───────────────────────────────────────┘
   ```

2. **Set Root Directory**
   - Click **Browse** to select the folder you want the NAS to serve
   - This becomes the root `/` of your file browser
   - Example: `D:\` → lists your entire D drive

3. **Set Password**
   - Enter any password you'll remember
   - This is required every time you access the web UI (or 5-minute auto-login)

4. **Set Port**
   - Default: `8000`
   - Use any unused port (avoid conflicting with other services)
   - Common alternatives: `7500`, `8080`, `9000`

5. **Start Server**
   - Click **Start Server** — status changes to `Running`
   - The server runs silently in the background as a separate process
   - Click **Open NAS Interface** to launch the web UI in your browser

6. **Stop Server**
   - Click **Stop Server** — safely terminates the Flask process
   - The GUI window stays open (no crash!)

### Settings Reference

| Field            | Description                                    |
|------------------|------------------------------------------------|
| Root Directory   | Base path for file browsing (e.g., `D:\`)      |
| NAS Password     | Authentication key for the web interface        |
| Server Port      | HTTP port for the web server                    |

---

## 🔒 Remote Access with Tailscale

### What is Tailscale?

[Tailscale](https://tailscale.com) is a zero-config VPN that creates a secure mesh network between your devices. It uses WireGuard under the hood and gives each device a unique private IP (e.g., `100.x.x.x`).

With Tailscale, you can access your NAS from anywhere in the world **without**:
- Port forwarding on your router
- Dynamic DNS services
- Exposing your server to the public internet

### Setup Guide

#### 1. Install Tailscale

**On Windows (NAS host):**
```bash
# Download from https://tailscale.com/download
# Or via winget:
winget install Tailscale.Tailscale
```

**On Linux (NAS host):**
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

**On your phone / laptop (client):**
- Install from App Store, Google Play, or https://tailscale.com/download

#### 2. Sign In

1. Open Tailscale on all devices
2. Sign in with the same Google / Microsoft / GitHub account
3. All your devices appear in the [Tailscale admin console](https://login.tailscale.com/admin/machines)

#### 3. Verify Connection

```bash
# On any device in your Tailnet, ping the NAS host:
ping 100.x.x.x   # Replace with your NAS host's Tailscale IP
```

Each device gets a unique `100.x.x.x` IP. You can find yours in the Tailscale system tray menu or admin console.

### Connecting to NAS via Tailscale

Once Tailscale is set up on both the NAS server and your client:

**1. Find your NAS Tailscale IP**
   - On the NAS machine: open Tailscale → your IP is shown (e.g., `100.85.23.112`)

**2. Start the NAS Server**
   - Launch `nas_gui.exe` → **Start Server**
   - Note the port you set (e.g., `7500`)

**3. Connect from anywhere**
   - Open your browser on any Tailscale-connected device
   - Navigate to: `http://100.x.x.x:7500/nas/`
   - Replace `100.x.x.x` with your NAS machine's Tailscale IP

**Example:**
```
http://100.85.23.112:7500/nas/
```

**4. Bookmark it** — This URL works from home, office, coffee shop, or anywhere with internet. No VPN disconnect needed!

### Security Notes

- ✅ **End-to-end encrypted** — Tailscale uses WireGuard encryption
- ✅ **No open ports** — Your firewall stays locked
- ✅ **Only your devices** — No one else can access your Tailnet
- ✅ **Auto-login** — 5-minute session TTL on the NAS UI
- ❌ **Don't share** your Tailscale IP and NAS password publicly

---

## 🛠️ Development

### Prerequisites
- Python 3.10+
- Pip packages: `pip install flask flask-cors python-dotenv psutil Pillow PySide6`
- Optional: `pypdfium2` for PDF viewing, `python-docx` for Word, `openpyxl` for Excel

### Project Structure
```
nas_tool/
├── nas/                    # Flask web application
│   ├── __init__.py         # Package init + version
│   ├── unified_nexus.py    # Flask server + all API endpoints
│   ├── index.html          # Frontend UI (single-page app)
│   └── icons/              # Custom icon assets
├── nas_gui.py              # Desktop GUI controller (PySide6)
├── nas_gui.spec            # PyInstaller build spec
├── build_windows.bat       # Windows build script
├── start_nas.sh            # Linux startup script
├── test_suite.py           # API test suite
├── RELEASE_NOTES.md        # Version changelog
└── README.md               # This file
```

### Running in Development
```bash
cd nas
# Start the Flask server directly
python unified_nexus.py
# Then open http://localhost:8000/nas/
```

---

## 📦 Build from Source

### Windows (PyInstaller)
```bash
cd nas_tool
pip install -r nas_requirements.txt
python -m PyInstaller --noconfirm nas_gui.spec
# Output: dist/nas_gui.exe
```

### Linux (no build needed)
The server runs directly with Python — no compilation required.

---

## 📄 License

Internal project.
