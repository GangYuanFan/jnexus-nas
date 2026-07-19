# Background Upload Spec — Resumable Chunked Upload via Service Worker

## Overview
Replace the current single-XHR per file upload with a chunked, resumable upload system that works through the Service Worker so uploads continue even when the page is backgrounded (mobile app switch, tab switch, browser minimize).

## Architecture

```
Page (index.html):
  File.slice(2MB chunks) → IndexedDB (upload progress) 
    → navigator.serviceWorker.controller.postMessage({type:'upload_chunk',...})
      ↓
Service Worker (sw.js):
    → fetch('POST /nas/api/upload/chunk?password=...', {body: chunk})
    → update IndexedDB progress
    → postMessage back to page with result
      ↓
Backend (unified_nexus.py):
    /api/upload/init  → return upload_id
    /api/upload/chunk → save chunk to .nas_uploads/<upload_id>/
    /api/upload/complete → merge chunks → move to final path
    /api/upload/status → return list of received chunk indices
```

## Database / Storage

### Backend temporary storage
- Location: `<ROOT_DIR>/.nas_uploads/<upload_id>/`
- Files: `chunk_<index>`, `metadata.json` (filename, path, total_chunks, total_size, mime)
- Cleanup: Stale uploads (older than 24h) cleaned on init/complete

### Frontend IndexedDB
- DB name: `JNAS_Uploads`
- Store: `uploads`
- Records: `{ upload_id, filename, path, total_chunks, total_size, mime, uploaded_chunks: Set<number>, status: 'uploading'|'paused'|'done'|'error' }`

---

## API Contract

### 1. POST /nas/api/upload/init
**Request** (JSON):
```json
{
  "filename": "photo.jpg",
  "path": "/some/folder",
  "total_size": 5242880,
  "mime": "image/jpeg",
  "total_chunks": 3
}
```
**Response**:
```json
{
  "success": true,
  "upload_id": "abc123def456"
}
```

### 2. POST /nas/api/upload/chunk
**Request** (multipart form-data):
- `upload_id`: string
- `chunk_index`: int (0-based)
- `file`: binary (the chunk data)

**Response**:
```json
{
  "success": true,
  "chunk_index": 3
}
```
Or on status 409 (chunk already exists):
```json
{
  "success": true,
  "chunk_index": 3,
  "already_exists": true
}
```

### 3. POST /nas/api/upload/complete
**Request** (JSON):
```json
{
  "upload_id": "abc123def456",
  "path": "/some/folder"
}
```
**Response**:
```json
{
  "success": true,
  "saved_path": "/home/jerry/workspace/some/folder/photo.jpg"
}
```

### 4. GET /nas/api/upload/status?upload_id=abc123def456
**Response**:
```json
{
  "success": true,
  "upload_id": "abc123def456",
  "received_chunks": [0, 1, 2],
  "total_chunks": 3,
  "is_complete": false,
  "filename": "photo.jpg"
}
```

---

## SW ↔ Page Message Protocol

### Page → SW (postMessage)
1. **Start upload chunk**:
```json
{
  "type": "upload_chunk",
  "upload_id": "abc123",
  "chunk_index": 0,
  "chunk_blob": <Blob>,
  "filename": "photo.jpg",
  "path": "/target",
  "total_chunks": 3,
  "total_size": 5242880,
  "mime": "image/jpeg"
}
```

2. **Check pending uploads**:
```json
{
  "type": "check_pending"
}
```

3. **Pause upload**:
```json
{
  "type": "pause_upload",
  "upload_id": "abc123"
}
```

### SW → Page (postMessage)
1. **Chunk result**:
```json
{
  "type": "chunk_result",
  "upload_id": "abc123",
  "chunk_index": 0,
  "success": true,
  "error": null
}
```

2. **Upload complete**:
```json
{
  "type": "upload_complete",
  "upload_id": "abc123",
  "filename": "photo.jpg",
  "saved_path": "..."
}
```

3. **Upload error**:
```json
{
  "type": "upload_error",
  "upload_id": "abc123",
  "chunk_index": 2,
  "error": "Network error"
}
```

4. **Pending uploads list**:
```json
{
  "type": "pending_list",
  "uploads": [
    {
      "upload_id": "abc123",
      "filename": "photo.jpg",
      "total_chunks": 3,
      "uploaded_chunks": [0, 1],
      "status": "uploading"
    }
  ]
}
```

---

## Frontend UX

1. User selects files → JS reads files, creates upload sessions via `/api/upload/init`
2. Chunks are stored in IndexedDB (upload manifest only, blobs are not stored in IDB — they're created via File.slice on demand)
3. Upload starts via SW message
4. When user leaves page, SW continues uploading chunks
5. When user returns, page reads IndexedDB → checks SW status via `check_pending` → shows "Background Upload Complete" notification + refreshes file list
6. UI: Upload progress bar (existing) + "Background Uploads" status bar showing active background uploads

### Resume Flow
```
Page loads → check IndexedDB for pending uploads
  → for each pending upload, call GET /api/upload/status?upload_id=xxx
  → skip chunks already received by server
  → re-send remaining chunks via SW
```

---

## File Changes

### 1. `unified_nexus.py` (Backend)
- Add `UPLOAD_TEMP_DIR = os.path.join(ROOT_DIR, '.nas_uploads')`
- Add 4 new routes: `/api/upload/init`, `/api/upload/chunk`, `/api/upload/complete`, `/api/upload/status`
- Add stale upload cleanup logic
- Add chunk reassembly logic

### 2. `sw.js` (Service Worker)
- Add IndexedDB for upload state
- Add `message` event listener for upload commands
- Add fetch-based upload logic
- Keep-alive: ping itself to stay alive during active uploads
- Progress tracking and page notification

### 3. `index.html` (Frontend)
- Add IndexedDB helper functions (openDB, saveUpload, getUpload, listUploads, etc.)
- Modify `handleUpload()` to use chunked upload via SW
- Add page visibility listener (when user returns, check for pending uploads)
- Add upload status banner showing active background uploads
- Add resume logic on page load

---

## Acceptance Criteria
1. ✅ Upload a 10MB+ file on mobile, switch app, come back → file is complete
2. ✅ Upload progress bar shows live progress
3. ✅ Upload multiple files simultaneously
4. ✅ If upload fails mid-way (network error), retry logic
5. ✅ Stale partial uploads get cleaned up server-side
6. ✅ Works on both mobile and desktop
