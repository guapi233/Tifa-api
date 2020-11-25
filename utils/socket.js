let io = require("socket.io");
const { getJwtPaload, isOverdue } = require("./index");
const { getUnReaders: getUnreadLikes } = require("../model/Like");
const { getUnReaders: getUnreadComments } = require("../model/Comment");
const { getUnReaders: getUnreadFollows } = require("../model/Follow");
const { getUnReaders: getUnreadSystems } = require("../model/System");

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
  emitFollow,
  emitSystem,
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
async function emitLike(uid, count = 1) {
  const socket = userList[uid];

  if (!socket) return;

  // let res = await getUnreadLikes(uid, true);
  // 因为推送是一条一条的推，所以数量只需要固定+1即可，不需要，每次重复查询

  emitNewMes(socket, "like", count);
}
// 推送评论更新消息
async function emitComment(uid, count = 1) {
  const socket = userList[uid];

  if (!socket) return;

  // let res = await getUnreadComments(uid, true);
  // 因为推送是一条一条的推，所以数量只需要固定+1即可，不需要，每次重复查询

  emitNewMes(socket, "comment", count);
}
// 推送关注更新消息
async function emitFollow(uid, count = 1) {
  const socket = userList[uid];

  if (!socket) return;

  // let res = await getUnreadFollows(uid, true);
  // 因为推送是一条一条的推，所以数量只需要固定+1即可，不需要，每次重复查询

  emitNewMes(socket, "follow", count);
}
// 推送系统通知（管理员）
async function emitSystem(uid, count = 1) {
  // uid存在则向指定用户推送通知，不存在则传给全部用户
  const socket = uid ? userList[uid] : userList[Object.keys(userList)[0]];

  if (!socket) return;

  // 查询未读信息
  // noop

  if (uid) {
    emitNewMes(socket, "system", count);
  } else {
    castNewMes(socket, {
      type: "system",
      data: 1,
      includeSelf: true,
    });
  }
}
// 查询当前全部未读的消息
async function emitAll(uid) {
  const socket = userList[uid];

  let like = await getUnreadLikes(uid, true);
  let comment = await getUnreadComments(uid, true);
  let follow = await getUnreadFollows(uid, true);
  let system = await getUnreadSystems(uid);

  emitNewMes(socket, "all", {
    like,
    comment,
    follow,
    system,
  });
}

// emit new message (except whisper)
function emitNewMes(socket, type, data) {
  socket.emit("hasNewMes", {
    type,
    data,
  });
}
// broadcast new message
function castNewMes(socket, { type, data, to = "", includeSelf = false }) {
  if (to) {
    socket.broadcast.to(to).emit("hasNewMes", {
      type,
      data,
    });
  } else {
    socket.broadcast.emit("hasNewMes", {
      type,
      data,
    });
  }

  // 要不要给自己发一下
  includeSelf && socket.emit("hasNewMes", { type, data });
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
