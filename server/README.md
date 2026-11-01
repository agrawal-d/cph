# Remote webserver for CPH

This directory contains remote backend services for CPH:

1. **Heartbeat Server (`server.js`)**: Tracks live active user count.
2. **Feedback Collector (`feedback-collector.js`)**: Collects user feedback
   submissions into an append-only CSV, and serves a full-screen spreadsheet
   viewer (`feedback-viewer.html`).

---

## 1. Heartbeat Server

### Installation on a VM

-   Install node
-   Copy `server.js` to `/opt/`
-   Install the service:

    ```bash
    sudo cp server.service /etc/systemd/system
    sudo systemctl daemon-reload
    sudo systemctl start server.service
    sudo systemctl enable server.service
    ```

-   Check status using `sudo systemctl status server.service`
-   In CPH, configure the address + port of the server.

### Uninstall

```bash
sudo systemctl stop server.service
sudo systemctl disable server.service
sudo rm /etc/systemd/system/server.service
```

---

## 2. Feedback Collector & Viewer

### Running Locally

```powershell
# PowerShell (Windows)
$env:READ_PASSWORD="your_password"; node feedback-collector.js
```

```bash
# Linux / macOS
READ_PASSWORD="your_password" node feedback-collector.js
```

### Quick Setup (One-Liner)

Installs and starts both the **Feedback Collector** and **Heartbeat Server** as
systemd services:

```bash
# One-liner Install (requires root and --read-password)
curl -fsSL https://raw.githubusercontent.com/agrawal-d/cph/refs/heads/main/server/setup.sh | sudo bash -s -- --install --read-password="your_password"

# One-liner Install with custom ports (feedback port default: 8090, heartbeat port default: 4546)
curl -fsSL https://raw.githubusercontent.com/agrawal-d/cph/refs/heads/main/server/setup.sh | sudo bash -s -- --install --read-password="your_password" --port=8090 --heartbeat-port=4546

# One-liner Uninstall (stops, disables, and removes both services)
curl -fsSL https://raw.githubusercontent.com/agrawal-d/cph/refs/heads/main/server/setup.sh | sudo bash -s -- --uninstall
```

### Manual Installation as a Systemd Service

-   Install Node.js
-   Copy `feedback-collector.js` and `feedback-viewer.html` to `/opt/`
-   Edit `feedback-collector.service` to set your desired `READ_PASSWORD` and
    `PORT`.
-   Install and enable:

    ```bash
    sudo cp feedback-collector.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl start feedback-collector.service
    sudo systemctl enable feedback-collector.service
    ```

-   Check status using:

    ```bash
    sudo systemctl status feedback-collector.service
    ```

### Manual Uninstall

```bash
sudo systemctl stop feedback-collector.service
sudo systemctl disable feedback-collector.service
sudo rm /etc/systemd/system/feedback-collector.service
```
