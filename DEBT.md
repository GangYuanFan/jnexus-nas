# Technical Debt Ledger

## J.NAS Storage Scanning
- **Shortcut**: Used `glob.glob('/mnt/*')` instead of `psutil.disk_partitions()` for disk discovery.
- **Reason**: `psutil.disk_partitions()` does not reliably detect 9p WSL mounts (`/mnt/c`, etc.) on this specific host.
- **Upgrade Path**: If a native WSL-aware library or a updated `psutil` version that handles WSL mounts correctly becomes available, switch back to a more standardized partition discovery method.
