import type { SysInfo, BackendFileEntry, TrashEntry, ServerConfig } from './types';

const BASE = '/nas/api';

let PASSWORD = '';

function pwParam(): string {
  return PASSWORD ? `?password=${encodeURIComponent(PASSWORD)}` : '';
}

function pwArg(): string {
  return PASSWORD ? `&password=${encodeURIComponent(PASSWORD)}` : '';
}

function pwBody(): Record<string, string> {
  return PASSWORD ? { password: PASSWORD } : {};
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

function fileEntryFromBackend(b: BackendFileEntry, parentPath: string = '') {
  const name = b.name;
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  const imageExts = new Set(['jpg','jpeg','png','gif','webp','svg','bmp']);
  const videoExts = new Set(['mp4','webm','mkv','mov','avi']);
  const audioExts = new Set(['mp3','wav','ogg','flac','m4a','aac']);
  const docExts = new Set(['pdf','doc','docx','xls','xlsx','ppt','pptx','csv','txt','md','json','xml','yaml','yml','log','cfg','ini','conf']);
  const path = parentPath
    ? (parentPath.endsWith('/') ? parentPath + name : parentPath + '/' + name)
    : name;
  return {
    path,
    name,
    type: (b.is_dir ? 'dir' : 'file') as 'file' | 'dir',
    size: b.size ?? 0,
    modified: new Date((b.mtime as number) * 1000).toISOString(),
    ext,
    is_media: imageExts.has(ext) || videoExts.has(ext) || audioExts.has(ext),
    is_image: imageExts.has(ext),
    is_video: videoExts.has(ext),
    is_audio: audioExts.has(ext),
    is_doc: docExts.has(ext),
  };
}

export const api = {
  setPassword(pw: string) { PASSWORD = pw; },
  clearPassword() { PASSWORD = ''; },

  // Auth
  login: (password: string) =>
    fetchJSON<{ success: boolean }>(`${BASE}/auth`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  // Config — no auth required
  getConfig: () => fetchJSON<ServerConfig>(`${BASE}/config`),

  // System info
  getSysInfo: () =>
    fetchJSON<SysInfo>(`${BASE}/sysinfo${pwParam()}`),

  // Files — returns array directly
  listFiles: async (path: string, _page?: number, _perPage?: number) => {
    const raw = await fetchJSON<BackendFileEntry[]>(`${BASE}/files${pwParam()}&path=${encodeURIComponent(path || '/')}`);
    return {
      entries: raw.map(e => fileEntryFromBackend(e, path)),
      path,
      parent: path === '/' ? null : path.split('/').slice(0, -1).join('/') || '/',
    };
  },

  searchFiles: async (query: string, page = 1) => {
    const raw = await fetchJSON<{ entries: BackendFileEntry[]; total: number }>(
      `${BASE}/search${pwArg()}&q=${encodeURIComponent(query)}&page=${page}`
    );
    return {
      entries: raw.entries.map(e => fileEntryFromBackend(e)),
      total: raw.total,
    };
  },

  deleteFiles: (paths: string[]) =>
    fetchJSON<{ success: boolean }>(`${BASE}/delete`, {
      method: 'POST',
      body: JSON.stringify({ paths, ...pwBody() }),
    }),

  renameFile: (oldPath: string, newName: string) =>
    fetchJSON<{ success: boolean }>(`${BASE}/rename`, {
      method: 'POST',
      body: JSON.stringify({ path: oldPath, new_name: newName, ...pwBody() }),
    }),

  createFolder: (path: string) =>
    fetchJSON<{ success: boolean }>(`${BASE}/mkdir`, {
      method: 'POST',
      body: JSON.stringify({ path, ...pwBody() }),
    }),

  uploadUrl: () => `${BASE}/upload${pwParam()}`,

  downloadUrl: (path: string) => `${BASE}/download${pwParam()}&path=${encodeURIComponent(path)}`,

  // Trash — returns { items: [...] }
  listTrash: async () => {
    const res = await fetchJSON<{ items: TrashEntry[] }>(`${BASE}/trash/list${pwParam()}`);
    return res.items;
  },

  restoreTrash: (path: string) =>
    fetchJSON<{ success: boolean }>(`${BASE}/trash/restore`, {
      method: 'POST',
      body: JSON.stringify({ path, ...pwBody() }),
    }),

  deleteTrash: (path: string) =>
    fetchJSON<{ success: boolean }>(`${BASE}/trash/permanent-delete`, {
      method: 'POST',
      body: JSON.stringify({ path, ...pwBody() }),
    }),

  emptyTrash: () =>
    fetchJSON<{ success: boolean }>(`${BASE}/trash/empty`, {
      method: 'POST',
      body: JSON.stringify(pwBody()),
    }),

  // Shares
  createShare: (path: string, expires?: string, maxDownloads?: number, sharePassword?: string) =>
    fetchJSON<{ token: string; url: string }>(`${BASE}/shares/create`, {
      method: 'POST',
      body: JSON.stringify({ path, expires, max_downloads: maxDownloads, password: sharePassword, ...pwBody() }),
    }),

  listShares: () =>
    fetchJSON<any[]>(`${BASE}/shares/list${pwParam()}`),

  deleteShare: (token: string) =>
    fetchJSON<{ success: boolean }>(`${BASE}/shares/delete`, {
      method: 'POST',
      body: JSON.stringify({ token, ...pwBody() }),
    }),

  // File content
  readFile: (path: string) =>
    fetchJSON<{ content: string }>(`${BASE}/read${pwParam()}&path=${encodeURIComponent(path)}`),

  saveFile: (path: string, content: string) =>
    fetchJSON<{ success: boolean }>(`${BASE}/save`, {
      method: 'POST',
      body: JSON.stringify({ path, content, ...pwBody() }),
    }),

  // View (media/doc)
  viewUrl: (path: string) => `${BASE}/view${pwParam()}&path=${encodeURIComponent(path)}`,

  // WebDAV
  webdavUrl: () => `${BASE}/webdav/status${pwParam()}`,

  // Terminal — not a web endpoint, opens port
  terminalUrl: () => `${BASE}/terminal${pwParam()}`,
};
