const mongoose = require("../utils/db");
const { getUuid } = require("../utils/index");

const Schema = mongoose.Schema;

const BlacklistedSchema = new Schema({
  blacklistedId: {
    type: String,
    index: {
      unique: true,
    },
  },
  targetId: String,
  authorId: String,
  created: Date,
});

const BlacklistedModel = mongoose.model("blacklisteds", BlacklistedSchema);

/**
 * 拉黑一个人
 * @param {Object} blacklistedObj 拉黑信息对象
 */
const newBlacklisted = async (blacklistedObj) => {
  let newer = new BlacklistedModel({
    ...blacklistedObj,
    blacklistedId: getUuid(),
    created: Date.now(),
  });

  try {
    await newer.save();

    return newer.toObject();
  } catch (err) {
    return false;
  }
};

/**
 * 取消拉黑一个人
 * @param {String} blacklistedId 拉黑Id
 */
const delBlacklisted = async (blacklistedId) => {
  const res = await BlacklistedModel.deleteOne({ blacklistedId });

  console.log(res);
  return res;
};

/**
 * 判断一个人是否被另一个人拉黑了
 * @param {String} targetId
 * @param {String} authorId
 */
const isBlackListed = async (targetId, authorId) => {
  const res = await BlacklistedModel.findOne({ targetId, authorId });

  return res;
};

module.exports = {
  BlacklistedModel,
  newBlacklisted,
  delBlacklisted,
  isBlackListed,
};
