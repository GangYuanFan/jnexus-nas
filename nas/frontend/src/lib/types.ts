export interface SysInfo {
  token_required: boolean;
  hostname: string;
  platform: string;
  cpu_percent: number;
  memory_total: number;
  memory_used: number;
  memory_percent: number;
  disk_total: number;
  disk_used: number;
  disk_free: number;
  disk_percent: number;
  uptime: string;
  server_port: number;
}

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  modified: string;
  is_media: boolean;
  is_image: boolean;
  is_video: boolean;
  is_audio: boolean;
  is_doc: boolean;
  ext: string;
}

export interface TrashEntry {
  name: string;
  original_path: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  deleted_at: string;
}

export interface DiskInfo {
  name: string;
  total: number;
  used: number;
  free: number;
  percent: number;
  mount: string;
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
  server_name: string;
  trash_enabled: boolean;
  trash_size: number;
}
