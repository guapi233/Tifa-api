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

  return res;
};

/**
 * 判断有没有拉黑行为（默认判断两人之间有任意拉黑即可）
 * @param {String} targetId 目标
 * @param {String} authorId 发起者
 * @param {Boolean} mutual 关闭后仅判断发起者对目标是否有拉黑行为
 */
const isBlackListed = async (targetId, authorId, mutual = true) => {
  const blacklisted = await BlacklistedModel.findOne({ targetId, authorId });
  if (!mutual) return blacklisted;

  const hasblacklisted = await BlacklistedModel.findOne({
    targetId: authorId,
    authorId: targetId,
  });

  return blacklisted || hasblacklisted;
};

/**
 * 获取屏蔽列表（默认包含我屏蔽的和屏蔽我的）
 * @param {*} authorId
 */
const getBlacklistedList = async (authorId, mutual = true) => {
  const result = [];
  const myBlacklisteds = await BlacklistedModel.find({ authorId });
  myBlacklisteds.forEach((item) => {
    result.push(item.targetId);
  });

  if (mutual) {
    const blacklistedmes = await BlacklistedModel.find({ targetId: authorId });
    blacklistedmes.forEach((item) => {
      result.push(item.authorId);
    });
  }

  return result;
};

module.exports = {
  BlacklistedModel,
  newBlacklisted,
  delBlacklisted,
  isBlackListed,
  getBlacklistedList,
};
