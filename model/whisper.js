const mongoose = require("../utils/db");
const { getUuid } = require("../utils/index");
const { RoomModel, setUpdated } = require("./Room");

const Schema = mongoose.Schema;

const WhisperSchema = new Schema({
  whisperId: {
    type: String,
    index: {
      unique: true,
    },
  },
  roomId: String,
  targetId: String,
  authorId: String,
  isRead: {
    type: Number,
    default: 0,
  },
  hidden: {
    type: Array,
    default: [],
  },
  content: String,
  created: Date,
  type: Number,
  status: {
    type: Number,
    default: 1,
  },
});

const WhisperModel = mongoose.model("whispers", WhisperSchema);

/**
 * 添加一条私信
 * @param {Object} whisperObj 私信信息对象
 */
const newWhisper = async (whisperObj) => {
  let newer = new WhisperModel({
    ...whisperObj,
    whisperId: getUuid(),
    created: Date.now(),
  });

  try {
    await newer.save();
    setUpdated(whisperObj.roomId);

    return newer.toObject();
  } catch (err) {
    return false;
  }
};

const getUnReaders = async (targetId) => {
  let res = await WhisperModel.find(
    {
      targetId,
      isRead: 0,
      status: 1,
    },
    "whisperId roomId"
  );

  // 查看未读消息的房间是否开启了免扰
  const undisturbRooms = [];
  let rooms = await RoomModel.find(
    { belongId: targetId, undisturb: 1 },
    "roomId"
  );
  rooms.forEach((room) => undisturbRooms.push(room.roomId));
  res = res.filter((whisper) => {
    return !undisturbRooms.includes(whisper.roomId);
  });

  return res.length;
};

module.exports = {
  WhisperModel,
  newWhisper,
  getUnReaders,
};
