# Remote webserver for CPH

Currently implements a heartbeat server for live user count.

## Installation on a VM

-   Install node
-   Copy `server.js` to `/opt/`
-   Install the service:

    ```
    sudo cp server.service /etc/systemd/system
    sudo systemctl daemon-reload
    sudo systemctl start server.service
    sudo systemctl enable server.service
    ```

-   Check status using `sudo systemctl status server.service`
-   In CPH, configure the address + port of the server.

## Uninstall

```
sudo systemctl stop server.service
sudo systemctl disable server.service
sudo rm /etc/systemd/system/server.service
```
