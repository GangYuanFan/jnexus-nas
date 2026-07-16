import type { SysInfo, FileEntry, TrashEntry, DiskInfo, ServerConfig } from './types';

const BASE = '/nas/api';

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

export const api = {
  // Auth
  login: (password: string) =>
    fetchJSON<{ success: boolean }>(`${BASE}/login`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  logout: () => fetchJSON(`${BASE}/logout`, { method: 'POST' }),

  check: () => fetchJSON<{ authenticated: boolean }>(`${BASE}/check`),

  // Config
  getConfig: () => fetchJSON<ServerConfig>(`${BASE}/config`),

  // System
  getSysInfo: () => fetchJSON<SysInfo>(`${BASE}/sysinfo`),

  getDisks: () => fetchJSON<DiskInfo[]>(`${BASE}/disks`),

  getStats: () => fetchJSON<{
    total_files: number;
    total_dirs: number;
    active_users: number;
  }>(`${BASE}/stats`),

  // Files
  listFiles: (path: string, page = 1, perPage = 100) =>
    fetchJSON<{ entries: FileEntry[]; path: string; parent: string | null }>(
      `${BASE}/files?path=${encodeURIComponent(path)}&page=${page}&per_page=${perPage}`
    ),

  searchFiles: (query: string, page = 1) =>
    fetchJSON<{ entries: FileEntry[]; total: number }>(
      `${BASE}/search?q=${encodeURIComponent(query)}&page=${page}`
    ),

  deleteFiles: (paths: string[]) =>
    fetchJSON<{ success: boolean }>(`${BASE}/delete`, {
      method: 'POST',
      body: JSON.stringify({ paths }),
    }),

  renameFile: (oldPath: string, newName: string) =>
    fetchJSON<{ success: boolean }>(`${BASE}/rename`, {
      method: 'POST',
      body: JSON.stringify({ path: oldPath, new_name: newName }),
    }),

  moveFiles: (paths: string[], destination: string) =>
    fetchJSON<{ success: boolean }>(`${BASE}/move`, {
      method: 'POST',
      body: JSON.stringify({ paths, destination }),
    }),

  copyFiles: (paths: string[], destination: string) =>
    fetchJSON<{ success: boolean }>(`${BASE}/copy`, {
      method: 'POST',
      body: JSON.stringify({ paths, destination }),
    }),

  createFolder: (path: string) =>
    fetchJSON<{ success: boolean }>(`${BASE}/mkdir`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),

  uploadUrl: () => `${BASE}/upload`,

  downloadUrl: (path: string) => `${BASE}/download?path=${encodeURIComponent(path)}`,

  // Trash
  listTrash: () => fetchJSON<TrashEntry[]>(`${BASE}/trash`),

  restoreTrash: (path: string) =>
    fetchJSON<{ success: boolean }>(`${BASE}/trash/restore`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),

  deleteTrash: (path: string) =>
    fetchJSON<{ success: boolean }>(`${BASE}/trash/delete`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),

  emptyTrash: () =>
    fetchJSON<{ success: boolean }>(`${BASE}/trash/empty`, {
      method: 'POST',
    }),

  // Shares
  createShare: (path: string, expires?: string, maxDownloads?: number, password?: string) =>
    fetchJSON<{ token: string; url: string }>(`${BASE}/share`, {
      method: 'POST',
      body: JSON.stringify({ path, expires, max_downloads: maxDownloads, password }),
    }),

  listShares: () => fetchJSON<any[]>(`${BASE}/shares`),

  deleteShare: (token: string) =>
    fetchJSON<{ success: boolean }>(`${BASE}/share/${token}`, { method: 'DELETE' }),

  // Terminal
  terminalUrl: () => `${BASE}/terminal`,

  // WebDAV
  webdavUrl: () => `${BASE}/webdav`,

  // Media
  viewUrl: (path: string) => `${BASE}/view?path=${encodeURIComponent(path)}`,

  // File content
  readFile: (path: string) =>
    fetchJSON<{ content: string }>(`${BASE}/read?path=${encodeURIComponent(path)}`),

  saveFile: (path: string, content: string) =>
    fetchJSON<{ success: boolean }>(`${BASE}/save`, {
      method: 'POST',
      body: JSON.stringify({ path, content }),
    }),

  // Icon
  iconUrl: (name: string) => `${BASE}/icon/${encodeURIComponent(name)}`,
};
