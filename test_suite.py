#!/usr/bin/env python3
"""
J.NAS Comprehensive Test Suite v2.0
Tests ALL backend APIs with proper error handling.
"""
import sys, os, json, requests, traceback
from pathlib import Path

PASS = FAIL = 0
BASE = "http://localhost:8000/nas/api"
PASSWORD = "JERRY_NEXUS_2026"

def test(name, fn):
    global PASS, FAIL
    try:
        fn()
        print(f"  ✅ {name}")
        PASS += 1
    except AssertionError as e:
        print(f"  ❌ {name} — {e}")
        FAIL += 1
    except Exception as e:
        print(f"  ❌ {name} — {type(e).__name__}: {str(e)[:120]}")
        FAIL += 1

def ok(cond, msg=""):
    if not cond:
        raise AssertionError(msg or "assertion failed")

def GET(url_suffix, **query):
    """GET with password auto-added. Doesn't follow redirects."""
    query["password"] = PASSWORD
    return requests.get(f"{BASE}{url_suffix}", params=query, timeout=15, allow_redirects=False)

def POST(url_suffix, json_data=None, form_data=None, files=None):
    """POST with password auto-added."""
    params = {"password": PASSWORD}
    if files:
        return requests.post(f"{BASE}{url_suffix}", params=params, data=form_data or {}, files=files, timeout=30)
    return requests.post(f"{BASE}{url_suffix}", params=params, json=json_data or {}, timeout=15)

print("=" * 60)
print("  🦞 J.NAS COMPREHENSIVE TEST SUITE")
print("=" * 60)

# ── 1. AUTH ──
print("\n📋 [1/7] Authentication")
test("Rejects wrong password", lambda: ok(
    requests.get(f"{BASE}/read", params={"password":"wrongpass123","path":""}).status_code == 401
))
test("Accepts correct password", lambda: ok(GET("/sysinfo").status_code == 200))
test("POST rejects wrong password", lambda: ok(
    requests.post(f"{BASE}/save", json={"path":"","content":""}, params={"password":"wrong"}).status_code == 401
))

# ── 2. FILESYSTEM ──
print("\n📋 [2/7] Filesystem Operations")
test("List root directory", lambda: (
    ok(GET("/files").status_code == 200),
    ok(len(GET("/files").json()) > 0)
))
test("List specific dir", lambda: ok(GET("/files", path="nas_tool").status_code == 200))
test("Path escape blocked (absolute path)", lambda: ok(GET("/read", path="/etc/passwd").status_code in (403, 500)))
test("../ escape blocked", lambda: ok(GET("/read", path="../../../etc/passwd").status_code == 403))
test("System info returns data", lambda: (
    ok(GET("/sysinfo").status_code == 200),
    ok("cpu_percent" in GET("/sysinfo").json())
))

# ── 3. FILE CRUD ──
print("\n📋 [3/7] File CRUD")
uid = os.urandom(4).hex()
test("Save text file", lambda: ok(POST("/save", json_data={"path":f"nas_tool/_t{uid}.txt","content":"line1\nline2"}).json().get("success")))
test("Read back text file", lambda: ok(GET("/read", path=f"nas_tool/_t{uid}.txt").text == "line1\nline2"))
test("Rename file", lambda: ok(POST("/rename", json_data={"oldPath":f"nas_tool/_t{uid}.txt","newName":f"_r{uid}.txt"}).json().get("success")))
test("Read after rename", lambda: ok(GET("/read", path=f"nas_tool/_r{uid}.txt").text == "line1\nline2"))
test("Delete file", lambda: ok(POST("/delete", json_data={"path":f"nas_tool/_r{uid}.txt"}).json().get("success")))
test("File gone after delete", lambda: ok(GET("/read", path=f"nas_tool/_r{uid}.txt").status_code == 500))

# ── 4. FILE UPLOAD (previously MISSED!) ──
print("\n📋 [4/7] File Upload (CRITICAL)")
test("Upload small text file", lambda: ok(
    POST("/upload", form_data={"path":"nas_tool"}, files={"file":(f"_u{uid}.txt",b"hello upload","text/plain")}).json().get("success")
))
test("Verify uploaded file content", lambda: ok(
    GET("/read", path=f"nas_tool/_u{uid}.txt").text == "hello upload"
))
test("Upload binary file (256 bytes)", lambda: ok(
    POST("/upload", form_data={"path":"nas_tool"}, files={"file":(f"_b{uid}.bin",bytes(range(256)),"application/octet-stream")}).json().get("success")
))
test("Upload larger file (10MB)", lambda: ok(
    POST("/upload", form_data={"path":"nas_tool"}, files={"file":(f"_l{uid}.bin",b"X"*10_000_000,"application/octet-stream")}).json().get("success")
))
test("Check all uploaded files exist", lambda: ok(
    sum(1 for f in GET("/files", path="nas_tool").json() if uid in f["name"]) == 3,
    "expected 3 test files"
))
# Cleanup uploads
test("Cleanup upload test files", lambda: ok(all(
    POST("/delete", json_data={"path":f"nas_tool/{f['name']}"}).json().get("success")
    for f in GET("/files", path="nas_tool").json() if uid in f["name"]
)))

# ── 5. DOCUMENT READ/WRITE ──
print("\n📋 [5/7] Document Read/Write")
d = uid

# DOCX
test("Save DOCX and read back", lambda: (
    ok(POST("/save_doc", json_data={"path":f"nas_tool/_d{d}.docx","content":[{"text":"A"},{"text":"B"}]}).json().get("success")),
    ok(GET("/read_doc", path=f"nas_tool/_d{d}.docx").json()["type"] == "word"),
    ok(len(GET("/read_doc", path=f"nas_tool/_d{d}.docx").json()["content"]) == 2)
))
test("Round-trip DOCX save", lambda: (
    ok(POST("/save_doc", json_data={"path":f"nas_tool/_d{d}.docx","content":[{"text":"Updated"}]}).json().get("success")),
    ok(GET("/read_doc", path=f"nas_tool/_d{d}.docx").json()["content"][0]["text"] == "Updated")
))
test("Delete DOCX test", lambda: ok(POST("/delete", json_data={"path":f"nas_tool/_d{d}.docx"}).json().get("success")))

# XLSX
test("Save XLSX and read back", lambda: (
    ok(POST("/save_doc", json_data={"path":f"nas_tool/_d{d}.xlsx","sheets":{"S1":[["A","B"],["1","2"]]}}).json().get("success")),
    ok(GET("/read_doc", path=f"nas_tool/_d{d}.xlsx").json()["type"] == "excel"),
    ok(GET("/read_doc", path=f"nas_tool/_d{d}.xlsx").json()["sheets"]["S1"][1][0] == "1")
))
test("Round-trip XLSX save", lambda: (
    ok(POST("/save_doc", json_data={"path":f"nas_tool/_d{d}.xlsx","sheets":{"S1":[["X","Y"],["3","4"]]}}).json().get("success")),
    ok(GET("/read_doc", path=f"nas_tool/_d{d}.xlsx").json()["sheets"]["S1"][1][0] == "3")
))
test("Delete XLSX test", lambda: ok(POST("/delete", json_data={"path":f"nas_tool/_d{d}.xlsx"}).json().get("success")))

# PPTX
test("Save PPTX and read back", lambda: (
    ok(POST("/save_doc", json_data={"path":f"nas_tool/_d{d}.pptx","slides":[{"texts":["Slide1"]},{"texts":["Slide2"]}]}).json().get("success")),
    ok(GET("/read_doc", path=f"nas_tool/_d{d}.pptx").json()["type"] == "powerpoint"),
    ok(GET("/read_doc", path=f"nas_tool/_d{d}.pptx").json()["slideCount"] == 2)
))
test("Delete PPTX test", lambda: ok(POST("/delete", json_data={"path":f"nas_tool/_d{d}.pptx"}).json().get("success")))

# PDF
test("PDF page render returns image", lambda: (
    ok(GET("/pdf_page", path="venv/lib/python3.12/site-packages/matplotlib/mpl-data/images/help.pdf", page=0, scale=1.0).status_code == 200),
    ok(len(GET("/pdf_page", path="venv/lib/python3.12/site-packages/matplotlib/mpl-data/images/help.pdf", page=0, scale=1.0).content) > 1000)
))
test("PDF page out of range = 404", lambda: ok(GET("/pdf_page", path="venv/lib/python3.12/site-packages/matplotlib/mpl-data/images/help.pdf", page=999).status_code == 404))
test("Unsupported doc type = 400", lambda: ok(GET("/read_doc", path=f"nas_tool/_d{d}.py").status_code == 400))
test("Read nonexistent file = 500", lambda: ok(GET("/read", path=f"nonexistent_{d}").status_code == 500))
test("Delete nonexistent file = 500", lambda: ok(POST("/delete", json_data={"path":f"nonexistent_{d}"}).status_code == 500))

# ── 6. THUMBNAILS & DOWNLOAD ──
print("\n📋 [6/7] Thumbnails & Download")
test("Image thumbnail returns redirect", lambda: ok(
    GET("/thumbnail", path="nas_tool/nas/icons/word_custom.png").status_code == 302
))
test("Text file thumbnail returns redirect", lambda: ok(
    GET("/thumbnail", path="nas_tool/test_suite.py").status_code == 302
))
test("Download file", lambda: ok(GET("/download", path="nas_tool/test_suite.py").status_code == 200))

# ── 7. FRONTEND ──
print("\n📋 [7/7] Frontend HTML Validation")
html = requests.get("http://localhost:8000/nas/", timeout=10).text
test("Frontend page loads", lambda: ok(html.startswith("<!DOCTYPE")))
test("FRONTEND: openDocCard exists", lambda: ok("openDocCard" in html))
test("FRONTEND: doc-overlay div exists", lambda: ok('id="doc-overlay"' in html))
test("FRONTEND: PDF viewer section", lambda: ok('id="pdf-viewer"' in html))
test("FRONTEND: Word viewer section", lambda: ok('id="word-viewer"' in html))
test("FRONTEND: Excel viewer section", lambda: ok('id="excel-viewer"' in html))
test("FRONTEND: PPT viewer section", lambda: ok('id="ppt-viewer"' in html))
test("FRONTEND: PDF zoom controls", lambda: ok('pdfZoomIn' in html))
test("FRONTEND: Excel editing", lambda: ok('excelEditCell' in html))
test("FRONTEND: PPT navigation", lambda: ok('pptPrevSlide' in html))
test("FRONTEND: Upload handler exists", lambda: ok('handleUpload' in html))
test("FRONTEND: Upload progress container hidden", lambda: ok('style="display:none"' in html or "upload-progress-container" in html))
test("FRONTEND: Drag drop support", lambda: ok('dragover' in html))
test("FRONTEND: XHR upload with password", lambda: ok('encodeURIComponent(userPassword)' in html))
test("FRONTEND: Upload error handling", lambda: ok('catch (e)' in html))
test("FRONTEND: Keyboard shortcuts for PDF", lambda: ok('pdfHandleKey' in html))
test("FRONTEND: Save button for docs", lambda: ok('doc-save-btn' in html))
test("FRONTEND: No old openPdfViewer", lambda: ok('openPdfViewer' not in html, "old function still present"))
test("HTML div balance", lambda: ok(
    html.count("<div ") + html.count("<div>") == html.count("</div>"),
    f"div balance: {html.count('<div ') + html.count('<div>')} opens vs {html.count('</div>')} closes"
))

# ── SUMMARY ──
print()
print("=" * 60)
total = PASS + FAIL
print(f"  RESULTS: {PASS}/{total} passed", "🎉" if FAIL == 0 else "⚠️")
if FAIL:
    print(f"  FAILURES: {FAIL}")
    sys.exit(1)
else:
    print("  ALL TESTS PASSED ✅")
print("=" * 60)
