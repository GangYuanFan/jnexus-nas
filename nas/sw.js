const CACHE = 'jnas-v2';
const PRECACHE = ['/nas/', '/nas/api/config'];
const UPLOADS_CACHE_KEY = 'jnas-uploads-v1';

// ===== Active upload sessions (in-memory) =====
const activeUploads = new Map(); // upload_id -> UploadSession

// ===== UploadSession =====
class UploadSession {
  constructor(data) {
    this.uploadId = data.upload_id;
    this.filename = data.filename;
    this.path = data.path;
    this.totalChunks = data.total_chunks;
    this.totalSize = data.total_size;
    this.mime = data.mime;
    this.uploadedChunks = new Set(data.uploaded_chunks || []);
    this.status = data.status || 'pending'; // pending, uploading, paused, done, error
    this.password = data.password || '';
  }

  toJSON() {
    return {
      upload_id: this.uploadId,
      filename: this.filename,
      path: this.path,
      total_chunks: this.totalChunks,
      total_size: this.totalSize,
      mime: this.mime,
      uploaded_chunks: [...this.uploadedChunks],
      status: this.status,
      password: this.password
    };
  }
}

// ===== Cache API Persistence =====
async function saveUploadState(session) {
  const cache = await caches.open(UPLOADS_CACHE_KEY);
  const key = `/__jnas_upload_state/${session.uploadId}`;
  const response = new Response(JSON.stringify(session.toJSON()), {
    headers: { 'Content-Type': 'application/json' }
  });
  await cache.put(key, response);
}

async function loadAllUploadStates() {
  const cache = await caches.open(UPLOADS_CACHE_KEY);
  const keys = await cache.keys();
  const states = [];
  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const data = await response.json();
      states.push(data);
    }
  }
  return states;
}

async function removeUploadState(uploadId) {
  const cache = await caches.open(UPLOADS_CACHE_KEY);
  await cache.delete(`/__jnas_upload_state/${uploadId}`);
}

// ===== Chunk Upload =====
async function uploadChunk(session, chunkIndex, chunkBlob) {
  const formData = new FormData();
  formData.append('upload_id', session.uploadId);
  formData.append('chunk_index', chunkIndex.toString());
  formData.append('file', chunkBlob);

  const url = `/nas/api/upload/chunk?password=${encodeURIComponent(session.password)}`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP ${response.status}`);
  }

  return await response.json();
}

// ===== Handle single chunk upload =====
async function handleSingleChunkUpload(msg) {
  let session = activeUploads.get(msg.upload_id);
  if (!session) {
    session = new UploadSession({
      upload_id: msg.upload_id,
      filename: msg.filename,
      path: msg.path,
      total_chunks: msg.total_chunks,
      total_size: msg.total_size,
      mime: msg.mime,
      password: msg.password || '',
      uploaded_chunks: msg.uploaded_chunks || []
    });
    activeUploads.set(msg.upload_id, session);
  }

  try {
    const result = await uploadChunk(session, msg.chunk_index, msg.chunk_blob);

    if (result.already_exists || result.success) {
      session.uploadedChunks.add(msg.chunk_index);
    }

    session.status = 'uploading';
    await saveUploadState(session);

    const progress = Math.round((session.uploadedChunks.size / session.totalChunks) * 100);

    // Notify all pages
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({
        type: 'chunk_result',
        upload_id: msg.upload_id,
        chunk_index: msg.chunk_index,
        success: true,
        progress: progress
      });
    }

    // Check if all chunks are done
    if (session.uploadedChunks.size >= session.totalChunks) {
      for (const client of clients) {
        client.postMessage({
          type: 'upload_complete',
          upload_id: msg.upload_id,
          filename: msg.filename,
          path: msg.path
        });
      }
      session.status = 'done';
      await saveUploadState(session);

      // Clean up after 5 seconds
      setTimeout(() => {
        removeUploadState(msg.upload_id);
        activeUploads.delete(msg.upload_id);
      }, 5000);
    }

    return true;
  } catch (error) {
    session.status = 'error';
    session.error = error.message;
    await saveUploadState(session);

    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({
        type: 'chunk_result',
        upload_id: msg.upload_id,
        chunk_index: msg.chunk_index,
        success: false,
        error: error.message
      });
    }
    return false;
  }
}

// ===== Service Worker Install =====
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ===== Service Worker Activate =====
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== UPLOADS_CACHE_KEY).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ===== Cache-first fetch (existing behavior, preserved) =====
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// ===== Message Handler =====
self.addEventListener('message', async (event) => {
  const msg = event.data;
  if (!msg || !msg.type) return;

  switch (msg.type) {

    case 'upload_chunk':
      await handleSingleChunkUpload(msg);
      break;

    case 'check_pending': {
      const states = await loadAllUploadStates();
      const pending = states.filter(s =>
        s.status === 'uploading' || s.status === 'pending' || s.status === 'error'
      );
      if (event.source) {
        event.source.postMessage({
          type: 'pending_list',
          uploads: pending
        });
      }
      break;
    }

    case 'pause_upload': {
      const session = activeUploads.get(msg.upload_id);
      if (session) {
        session.status = 'paused';
        await saveUploadState(session);
      }
      if (event.source) {
        event.source.postMessage({
          type: 'upload_paused',
          upload_id: msg.upload_id
        });
      }
      break;
    }

    case 'resume_upload': {
      const states = await loadAllUploadStates();
      const sessionData = states.find(s => s.upload_id === msg.upload_id);
      if (sessionData) {
        const resumed = new UploadSession(sessionData);
        activeUploads.set(msg.upload_id, resumed);
        resumed.status = 'uploading';
        await saveUploadState(resumed);
      }
      if (event.source) {
        event.source.postMessage({
          type: 'upload_resumed',
          upload_id: msg.upload_id
        });
      }
      break;
    }

    case 'cancel_upload': {
      activeUploads.delete(msg.upload_id);
      await removeUploadState(msg.upload_id);
      if (event.source) {
        event.source.postMessage({
          type: 'upload_cancelled',
          upload_id: msg.upload_id
        });
      }
      break;
    }

    case 'clear_upload': {
      await removeUploadState(msg.upload_id);
      activeUploads.delete(msg.upload_id);
      break;
    }

    default:
      // Unknown message types are silently ignored (per AI_RULES.md)
      break;
  }
});
