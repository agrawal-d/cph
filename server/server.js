const http = require('http');
const { env } = require('process');

class HeartbeatServer {
    constructor() {
        console.log("Creating new HeartbeatServer instance");

        this.ips = new Map();
        this.refresh_interval_seconds = parseInt(env.REFRESH_INTERVAL) || 30;
        this.port = parseInt(env.PORT) || 8080;
        console.log(`Refresh interval: ${this.refresh_interval_seconds} seconds`);

        this.runServer(this.port);

        setInterval(() => {
            this.runCleanup();
        }, this.refresh_interval_seconds * 1000);
    }

    runServer(port) {
        console.log("Starting heartbeat server on port " + port);
        this.serverInstance = http.createServer((req, res) => {
            this.processHeartbeat(req.socket.remoteAddress);
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(this.ips.size.toString());
        });
        this.serverInstance.listen(port);
        console.log("Heartbeat server started.");
    }

    runCleanup() {
        const oldLen = this.ips.size;
        const now = Date.now();
        for (const [ip, timestamp] of this.ips.entries()) {
            if (now - timestamp > this.refresh_interval_seconds * 1000) {
                this.ips.delete(ip);
                console.log("Deleted stale IP: " + ip);
            }
        }
        const newLen = this.ips.size;
        console.log(`Cleaned up ${oldLen - newLen} stale IPs. New count: ${newLen}`);
    }

    // Called when a heartbeat is received from an IP
    processHeartbeat(ip) {
        this.ips.set(ip, Date.now());
    }
}

console.log("Starting app");
new HeartbeatServer();
