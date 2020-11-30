const mongoose = require("mongoose");
const { getUuid } = require("../utils/index");

const Schema = mongoose.Schema;

const RoomSchema = new Schema({
  roomId: String,
  belongId: String,
  oppositeId: String,
  show: {
    type: Number,
    default: 1,
  },
  undistrub: {
    type: Number,
    default: 0,
  },
  topping: {
    type: Number,
    default: 0,
  },
  created: Date,
  updated: Date,
});

const RoomModel = mongoose.model("rooms", RoomSchema);

/**
 * 添加一对聊天窗口
 * @param {String} belongId 用户Id
 * @param {String} oppositeId 对方用户Id
 */
const newRoom = async (belongId, oppositeId) => {
  const roomId = getUuid();

  let self = new RoomModel({
    roomId,
    belongId,
    oppositeId,
    created: Date.now(),
    updated: Date.now(),
  });

  let oppo = new RoomModel({
    roomId,
    belongId: oppositeId,
    oppositeId: belongId,
    created: Date.now(),
  });

  try {
    await self.save();
    await oppo.save();

    return self.toObject();
  } catch (err) {
    return false;
  }
};

/**
 * 同步房间更新时间
 * @param {*} roomId 房间Id
 */
const setUpdated = async (roomId) => {
  const updated = Date.now();
  await RoomModel.updateMany({ roomId }, { updated });
};

/**
 * 开/管私信窗口
 * @param {*} roomId 房间（窗口）Id
 * @param {*} belongId 谁的
 * @param {*} show 状态值（1开启、0关闭）
 */
const setRoomShow = async (roomId, belongId, show) => {
  show = Number(show) || 0;
  const setObj = { show, updated: Date.now() };
  show === 0 && (setObj.topping = 0);

  let res = await RoomModel.updateOne({ roomId, belongId }, setObj);

  return res.n;
};

module.exports = {
  RoomModel,
  newRoom,
  setUpdated,
  setRoomShow,
};
