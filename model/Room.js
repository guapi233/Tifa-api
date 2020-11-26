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
  topping: {
    type: Number,
    default: 0,
  },
  created: Date,
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

module.exports = {
  RoomModel,
  newRoom,
};
