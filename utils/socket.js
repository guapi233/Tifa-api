let io = require("socket.io");
const { getJwtPaload, isOverdue } = require("./index");
const { getUnReaders: getUnreadLikes } = require("../model/Like");
const { getUnReaders: getUnreadComments } = require("../model/Comment");

const socketify = (server) => {
  io = io(server, {
    cors: true,
  });

  io.on("connection", connection);
};

module.exports = {
  socketify,
  emitLike,
  emitComment,
};

const userList = {};

// socket 连接成功（入口）
function connection(socket) {
  console.log("one socket is connected...");

  socket.on("auth", (token) => {
    const { usernumber, exp } = getJwtPaload(token);

    // 鉴权失败
    if (!usernumber || isOverdue(Number(exp) * 1000)) {
      return fail(socket, "auth", "鉴权失败");
    }

    sucs(socket, "auth", "鉴权成功");
    socket.uid = usernumber;
    userList[usernumber] = socket;

    // 推送未读通知
    emitAll(usernumber);

    // 绑定监听事件
    socket.on("disconnect", disconnect);
  });
}

// socket 断开连接
function disconnect() {
  delete userList[this.uid];
}
// 推送点赞更新消息
async function emitLike(uid) {
  const socket = userList[uid];

  let res = await getUnreadLikes(uid, true);

  emitNewMes(socket, "like", res);
}
// 推送评论更新消息
async function emitComment(uid) {
  const socket = userList[uid];

  let res = await getUnreadComments(uid, true);

  emitNewMes(socket, "comment", res);
}
// 查询当前全部未读的消息
async function emitAll(uid) {
  const socket = userList[uid];

  let like = await getUnreadLikes(uid, true);
  let comment = await getUnreadComments(uid, true);

  emitNewMes(socket, "all", {
    like,
    comment,
  });
}

// emit new message (except whisper)
function emitNewMes(socket, type, data) {
  socket.emit("hasNewMes", {
    type,
    data,
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
