let io = require("socket.io");
const { getJwtPaload, isOverdue } = require("./index");

const socketify = (server) => {
  io = io(server, {
    cors: true,
  });

  io.on("connection", connection);
};

module.exports = socketify;

// socket 连接成功
function connection(socket) {
  console.log("one socket is connected...");

  socket.on("auth", (token) => {
    const { usernumber, exp } = getJwtPaload(token);

    if (!usernumber || isOverdue(Number(exp) * 1000)) {
      return fail(socket, "auth", "鉴权失败");
    }

    sucs(socket, "auth", "鉴权成功");
    socket.id = usernumber;
  });
}

// 返回失败数据
function fail(socket, key, data) {
  socket.emit(key, {
    isOk: 0,
    data,
  });
}

// 返回成功数据
function sucs(socket, key, data) {
  socket.emit(key, {
    isOk: 1,
    data,
  });
}
