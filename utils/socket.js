let io = require("socket.io");

const socketify = (server) => {
  io = io(server, {
    cors: true,
  });

  io.on("connection", (socket) => {
    console.log("one socket is connected...");
  });
};

module.exports = socketify;
