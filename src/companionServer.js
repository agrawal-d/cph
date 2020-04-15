const http = require("http");
const config = require("./config");
const EventEmitter = require("events");

function companionServer() {
  try {
    const server = http.createServer((req, res) => {
      console.dir(req);
      let cc = "";
      req.on("readable", function(data) {
        console.log("Server get data start.");
        let tmp = req.read();
        if (tmp && tmp != null && tmp.length > 0) {
          cc += tmp;
        }
      });
      req.on("close", function() {
        cc = JSON.parse(cc);
        console.log("Event emitted");
        global.companionEmitter.emit("new-problem", cc);
      });
      res.write("OK");
      res.end();
    });
    server.listen(config.port);
    console.log("Companion server listening on port", config.port);
    return server;
  } catch (e) {
    console.error("Server serror :", e);
  }
}

module.exports = companionServer;
