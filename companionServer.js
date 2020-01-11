const http = require("http");
const config = require("./config");
const EventEmitter = require('events');

function companionServer() {
    try {
        const server = http.createServer((req, res) => {
            let cc = "";
            let tmp;
            req.on("readable", function () {
                tmp = null;
                tmp = req.read();
                if (tmp && tmp != null && tmp.length > 0) {
                    cc += tmp;
                }
            });
            req.on("end", function () {
                cc = JSON.parse(cc);
                console.log("Event emitted");
                global.companionEmitter.emit("new-problem", cc);
            });
            res.end();
        });
        server.listen(config.port);
        return server;
    } catch (e) {
        console.error("Server serror :", e);
    }
}

module.exports = companionServer;
