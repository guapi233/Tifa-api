const mongoose = require("mongoose");
const { getUuid } = require("../utils/index");
const { setUpdated } = require("./Room");

const Schema = mongoose.Schema;

const WhisperSchema = new Schema({
  whisperId: {
    type: String,
    index: {
      unique: true,
    },
  },
  roomId: String,
  authorId: String,
  isRead: {
    type: Number,
    default: 1,
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

const getUnReaders = async () => {};

module.exports = {
  WhisperModel,
  newWhisper,
  getUnReaders,
};
