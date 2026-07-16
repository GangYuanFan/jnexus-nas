// --- Backend API response types (from unified_nexus.py) ---

export interface SysInfo {
  cpu_percent: number;
  cpu_count: number;
  platform: string;
  hostname: string;
  memory: {
    total_gb: number;
    used_gb: number;
    percent: number;
  };
  disks: BackendDisk[];
  network: {
    bytes_sent: number;
    bytes_recv: number;
  };
  uptime_human: string;
}

export interface BackendDisk {
  mount: string;
  label: string;
  total_gb: number;
  used_gb: number;
  percent: number;
}

export interface BackendFileEntry {
  name: string;
  is_dir: boolean;
  size: number | null;
  mtime: number; // unix timestamp
}

// Frontend-friendly versions (computed)
export interface FileEntry {
  path: string;
  name: string;
  type: 'file' | 'dir';
  size: number;
  modified: string; // ISO date
  ext: string;
  is_media: boolean;
  is_image: boolean;
  is_video: boolean;
  is_audio: boolean;
  is_doc: boolean;
}

export interface TrashEntry {
  name: string;
  original_path: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  deleted_at: string;
}

export interface ShareInfo {
  token: string;
  path: string;
  expires: string | null;
  downloads: number;
  max_downloads: number | null;
  password: boolean;
}

export interface ServerConfig {
  root: string;
  version: string;
  release_date: string;
}
