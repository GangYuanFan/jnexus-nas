# TrueNAS SCALE 功能調查 — J.NAS 可抄功能規劃

> Survey Date: 2026-07-15
> Reference: TrueNAS CE (原 SCALE) 25.10 / 26 Beta (Halfmoon)

---

## 一、TrueNAS SCALE 是什麼？

TrueNAS SCALE（現稱 TrueNAS Community Edition）是一套 **Debian Linux 為底層**的 NAS 作業系統，由 iXsystems 開發。2026 年 TrueNAS CORE（FreeBSD）已進入維護期，SCALE 是目前唯一活躍開發的主線。

**底層技術棧：**
- OS：Debian 12 + Linux Kernel 6.6
- 檔案系統：ZFS (OpenZFS 2.4)
- 容器：Docker / Docker Compose / LXC
- VM：KVM/QEMU
- 管理介面：Web UI

---

## 二、TrueNAS SCALE 完整功能分類

### A. ZFS 儲存管理（核心）

| 功能 | 說明 | 等級 |
|------|------|:----:|
| RAID-Z1/Z2/Z3 | 軟體 RAID（單/雙/三 同位元檢查） | ⭐️⭐️⭐️ |
| dRAID | 分散式 RAID，大容量池專用 | ⭐️⭐️⭐️ |
| Mirror/Stripe | 傳統鏡像/條帶化 | ⭐️⭐️ |
| RAID-Z 擴容 | 動態增加硬碟到 RAID-Z（OpenZFS 2.4） | ⭐️⭐️⭐️ |
| Pool/DataSet 管理 | 儲存池建立、擴充、刪除 | ⭐️⭐️ |
| 快照 (Snapshots) | 無限快照，不可變快照（防勒索） | ⭐️⭐️⭐️ |
| 複製 (Replication) | 本地/遠端、自動恢復、串聯複製 | ⭐️⭐️⭐️ |
| Clone | 空間高效複本 | ⭐️ |
| 壓縮 (Compression) | 行內適應性壓縮 (LZ4/ZSTD/etc) | ✅ 必抄 |
| 重覆資料刪除 | 行內 Dedup、Fast Dedup (OpenZFS 2.4) | ⭐️⭐️ |
| Thin/Thick Provisioning | 精簡/完整配置 | ⭐️ |
| ARC/L2ARC 快取 | RAM 讀取快取 + SSD 二級快取 | ✅ 了解 |
| SLOG/ZIL | 寫入快取（SSD/NVDIMM） | ⭐️ |
| Hybrid Flash Pool | 混合 SSD + HDD 分層（TrueNAS 26 新功能） | ⭐️⭐️⭐️ |
| 自我修復 Checksums | ZFS 端到端資料完整性 | ✅ 理念可抄 |

### B. 檔案分享協定

| 功能 | 說明 | 可抄？ |
|------|------|:------:|
| **SMB/CIFS** | Windows 網路芳鄰分享 | 🔥 **高** |
| **NFSv3/v4** | Linux/UNIX 掛載 | 🔥 **高** |
| **iSCSI** | 區塊級儲存 | ⭐️ 中 |
| **S3 Object (MinIO)** | 物件儲存 | 🔥 **高** |
| WebDAV | HTTP 檔案存取 | ⭐️ 低 |
| FTP/SFTP | 傳統檔案傳輸 | ⭐️ 低 |
| Rsync | 增量同步 | 🔥 **中** |

### C. App 生態系（最大差異化功能）

TrueNAS SCALE 內建 App 目錄，可以直接一鍵部署：

| 熱門 App | 用途 | 是否值得在 J.NAS 內建？ |
|-----------|------|:-----------------------:|
| **Immich** 🏆 | 照片備份管理（Google Photos 替代） | 🔥 最值得 |
| **Nextcloud** | 私有雲端硬碟 + 協作 | ✅ 值得 |
| **Plex / Jellyfin** | 媒體串流伺服器 | ✅ 值得 |
| **qBittorrent** | BT 下載器 | ⭐️ 可選 |
| **Home Assistant** | 智慧家庭 | ⭐️ 不關 NAS |
| **MinIO** | S3 相容物件儲存 | ✅ 值得 |
| **Syncthing** | 設備間同步 | ✅ 值得 |
| **Vaultwarden** | 密碼管理器 | ⭐️ 可選 |
| **AdGuard Home** | DNS 廣告過濾 | ⭐️ 可選 |
| **PostgreSQL / MariaDB** | 資料庫 | ⭐️ 可選 |

**TrueNAS App 優勢：** 透過 Helm Charts / Docker Compose 一鍵部署、GPU 直通、Volume 自動掛載。

### D. 虛擬機 (KVM)

| 功能 | 說明 |
|------|------|
| VM 建立 | Windows/Linux/FreeBSD 來賓 |
| PCIe Passthrough | 硬體直通（GPU、NVMe） |
| USB Passthrough | USB 裝置直通 |
| CPU Pinning | 固定 CPU 核心 |
| GPU Sharing | GPU 共享於容器/VM |

### E. 備份與資料保護

| 功能 | 說明 |
|------|------|
| ZFS 快照排程 | 自動定時快照（每小時/每天/每週） |
| 複製任務 | 推/拉複製到遠端 TrueNAS |
| Cloud Sync | 同步至 S3、Backblaze B2、Google Cloud、OneDrive |
| Rsync 任務 | 傳統 rsync 排程 |
| 系統設定備份 | 一鍵下載完整 config |
| iX-Storj | 去中心化雲端備份（企業版） |

### F. 監控與管理

| 功能 | 說明 |
|------|------|
| Web UI Dashboard | 儀表板（CPU/RAM/Net/Disks/ZFS） |
| Netdata | 即時系統監控 🔥 |
| TrueNAS Connect | 雲端管理入口（類似我們的 ngrok） |
| SNMP | 網路監控協定 |
| Email/Slack/Discord 警報 | 異常事件通知 |
| TrueCommand | 多台 TrueNAS 統一管理 |

### G. 網路

| 功能 | 說明 |
|------|------|
| VLAN/LAGG/Bridge | 進階網路設定 |
| WireGuard VPN | 內建 VPN 伺服器 🔥 |
| OpenVPN | 傳統 VPN |
| 靜態路由 | 進階路由 |
| DNS 設定 | 自訂 DNS |
| 靜態 DHCP | IP 綁定 |
| 400GbE 支援 | 企業級網卡 |

### H. 安全性

| 功能 | 說明 |
|------|------|
| ACL 細粒度權限 | NFSv4/SMB ACL |
| 本機使用者/群組 | 多用戶系統 |
| Active Directory | AD 整合 |
| LDAP/Kerberos | 目錄服務 |
| 2FA | 雙因子驗證 |
| 磁碟加密 (ZFS) | Pool/DataSet 層級加密 |
| 自我加密硬碟 (TCG Opal) | 硬體加密 |
| KMIP | 金鑰管理（企業版） |

---

## 三、J.NAS 目前擁有的功能 vs TrueNAS SCALE

| 類別 | J.NAS 現有 | TrueNAS SCALE |
|:-----|:-----------|:--------------|
| 檔案瀏覽 | ✅ **有**（Flask + JS） | ✅ 有 |
| 程式碼編輯器 (Monaco) | ✅ **有** | ❌ 無（非設計目標） |
| 文件檢視 (PDF/Word/Excel) | ✅ **有**（獨家特色） | ❌ 無 |
| 媒體播放 | ✅ **有**（圖片/影片） | ❌ 無（透過 App 如 Plex） |
| 檔案上傳/下載/刪除 | ✅ **有** | ✅ 有 |
| 系統監控 (CPU/RAM/磁碟) | ✅ **有**（psutil） | ✅ 有（更完整） |
| 密碼驗證 | ✅ **有**（單一密碼） | ✅ 有（多用戶 + ACL） |
| **ZFS Pool 管理** | ❌ **無** | ✅ **有** |
| **RAID 管理** | ❌ **無** | ✅ **有** |
| **快照與複製** | ❌ **無** | ✅ **有** |
| **SMB/NFS/iSCSI 分享** | ❌ **無** | ✅ **有** |
| **App 一鍵安裝** | ❌ **無** | ✅ **有**（Docker/Helm） |
| **S3 物件儲存** | ❌ **無** | ✅ **有**（MinIO） |
| **照片備份 (Immich)** | ❌ **無** | ✅ **有**（App） |
| **VPN (WireGuard)** | ❌ **無** | ✅ **有**（內建） |
| **VM 虛擬機** | ❌ **無** | ✅ **有**（KVM） |
| **多用戶 + AD/LDAP** | ❌ **無** | ✅ **有** |
| **警報系統 (Email/Webhook)** | ❌ **無** | ✅ **有** |
| **網芳 (SMB) 整合** | ❌ **無** | ✅ **有** |
| **Tailscale 整合** | ✅ **有**（文件教學） | ✅ 可自行安裝 |

---

## 四、🔥 J.NAS 可抄功能 — 優先級排序

根據目前 J.NAS 的定位（輕量級瀏覽器 NAS 管理工具），以下按 **實作價值 + 難度** 推薦：

### P0 — 立即該抄（高價值、中低成本）

#### 1️⃣ 網芳 (SMB) 自動探索與管理
- **為什麼：** 讓 Windows 用戶可以直接把 J.NAS 當成網路磁碟機掛載
- **TrueNAS 怎麼做的：** Web UI 設定 SMB Share → 指定 Dataset → 自動啟動 Samba
- **如何抄：** 在後端整合 `samba` + `wsdd`（讓 Windows 網路芳鄰自動發現），J.NAS 提供 SMB 資料夾管理 UI
- **預期效果：** 用戶可在檔案總管直接打 `\\100.99.4.98\share` 存取檔案

#### 2️⃣ 內建 VPN (WireGuard) 管理
- **為什麼：** 不需要額外裝 Tailscale 就能安全遠端存取
- **TrueNAS 怎麼做的：** Web UI 設定 WireGuard 介面 + Peer
- **如何抄：** 透過 `wg-quick` CLI，J.NAS 提供 Peer 管理 UI（新增/刪除/QR code 匯出）
- **預期效果：** 手機直接連 VPN 就能進入內網，比 Tailscale 更乾淨

#### 3️⃣ 快照管理 UI (Snapshots)
- **為什麼：** 資料保護最基本需求
- **TrueNAS 怎麼做的：** ZFS snapshot + Web UI 管理（新增/排程/回滾）
- **如何抄：** 透過 `zfs snapshot` / `zfs list -t snapshot` CLI，J.NAS 提供快照排程 UI
- **注意：** 前提是底層已經是 ZFS（目前 `/dev/sdd` 沒看到 ZFS，如果是 ext4 需要先轉）

### P1 — 值得抄（高價值、中等成本）

#### 4️⃣ Docker App 管理面板
- **為什麼：** 讓用戶可以一鍵啟動 Immich、Plex、Nextcloud
- **TrueNAS 怎麼做的：** App Catalog (Helm Charts) + UI
- **如何抄：** 在 J.NAS 整合 Docker Compose，提供「App Store」UI：預先寫好 `docker-compose.yml` 模板，點擊即部署
- **預期效果：** 點一下就能裝 Immich 照片備份、Plex 影音串流

#### 5️⃣ S3 物件儲存 (MinIO)
- **為什麼：** 與 AWS S3 相容，備份工具可直接寫入
- **TrueNAS 怎麼做的：** 透過 MinIO App 一鍵部署
- **如何抄：** Docker Compose spin up MinIO 容器，J.NAS 提供 Bucket 管理 UI
- **預期效果：** Veeam、rclone、各種備份工具可以直接把資料備份到 J.NAS

#### 6️⃣ 警報通知系統
- **為什麼：** 磁碟快滿、服務掛掉時要主動通知
- **TrueNAS 怎麼做的：** Email / Slack / Discord Webhook
- **如何抄：** 加入 Webhook 設定 UI，支援 Telegram / Discord / Email 警報
- **預期效果：** 磁碟使用率 > 90% 時自動發 Telegram 通知

### P2 — 長期可考慮（高價值、高成本）

#### 7️⃣ 多用戶 + 權限系統
- **為什麼：** 家庭成員/同事共用時需要隔離
- **TrueNAS 怎麼做的：** AD/LDAP + ACL + 本機使用者
- **如何抄：** 加入使用者資料庫（SQLite），引入 Linux ACL 控制

#### 8️⃣ 排程任務 (Cron Jobs)
- **為什麼：** 自動化備份、清理等操作
- **TrueNAS 怎麼做的：** Web UI 可設定 Cron 任務 + Script 執行
- **如何抄：** 加入 Cron 排程 UI（已有 systemd timer 基礎）

#### 9️⃣ 系統配置備份
- **為什麼：** J.NAS 設定可匯出/匯入，不怕重裝
- **TrueNAS 怎麼做的：** 一鍵下載 `.tar` config 檔
- **如何抄：** 匯出 J.NAS 所有設定為 JSON（密碼、root path、port、app 清單）

### P3 — 不建議抄（TrueNAS 原生優勢）

| 功能 | 原因 |
|------|------|
| **RAID 管理** | 底層需要 ZFS/硬體 RAID，J.NAS 是應用層不適合 |
| **KVM 虛擬機** | 太重了，且 WSL 環境不支援 KVM |
| **AD/LDAP 目錄服務** | 家用場景用不到，除非整合公司環境 |
| **400GbE / NVMe-oF** | 企業級功能，硬體不支援 |

---

## 五、建議執行路線圖

```
Phase 1 (短期 1-2 週)
┌─────────────────────────────────────────┐
│ ✅ SMB 檔案分享 UI                      │ ← 讓 Windows 可直接掛載
│ ✅ WireGuard VPN UI                     │ ← 取代 Tailscale 依賴
│ ✅ 快照管理 UI (若底層是 ZFS)           │ ← 資料保護基礎
└─────────────────────────────────────────┘

Phase 2 (中期 2-4 週)
┌─────────────────────────────────────────┐
│ ✅ Docker App Store (Immich/Plex/Syncthing) │ ← 殺手級功能
│ ✅ MinIO S3 物件儲存                    │ ← 備份相容性
│ ✅ 警報通知 (Telegram/Discord)          │ ← 主動監控
└─────────────────────────────────────────┘

Phase 3 (長期 1-2 月)
┌─────────────────────────────────────────┐
│ ✅ 多用戶權限系統                       │
│ ✅ 排程任務 UI                          │
│ ✅ 系統配置備份/還原                    │
│ ✅ WebDAV 支援                          │
└─────────────────────────────────────────┘
```

---

## 六、結論

### TrueNAS SCALE 強在哪裡？
1. **ZFS + RAID** — 資料保護無敵（但我們底層可能是 ext4）
2. **App 生態系** — Immich / Plex / Nextcloud 一鍵安裝
3. **SMB/NFS/iSCSI** — 業界標準檔案分享協定
4. **Snapshots + Replication** — 企業級備份鏈
5. **WireGuard VPN** — 內建安全連線

### J.NAS 獨有優勢（TrueNAS 做不到的）
1. **Monaco 程式碼編輯器** — 可直接在瀏覽器寫 code
2. **PDF/Word/Excel/PPT 內建檢視與編輯** — TrueNAS 沒有 office 文件預覽
3. **極輕量** — Flask + HTML 單一檔案，無需安裝
4. **更現代化的 UI** — TrueNAS 介面偏老派

### 建議策略
> **不要重造輪子，但要造更好的輪框。**
>
> J.NAS 應該專注於 TrueNAS 沒有的東西（編輯器、文件檢視、現代 UI），
> 而對於 TrueNAS 做得好的功能（SMB、VPN、App 安裝、快照），
> 直接整合底層工具，用我們的 UI 包裝起來，不需要從零開發。

---

## 附錄：目前 J.NAS 底層環境

| 項目 | 值 |
|------|-----|
| OS | WSL2 (Linux) |
| 主要磁碟 | `/dev/sdd` ~1TB (ext4) |
| 服務方式 | systemd (`jnexus.service`) |
| 底層檔案系統 | ext4（不是 ZFS） |
| 框架 | Flask + Python |
| 前端 UI | 自訂 HTML + JavaScript |
| 遠端存取 | Tailscale + ngrok |
| 容器支援 | 有 Docker (待確認) |
