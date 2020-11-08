const mongoose = require("../utils/db");
const { getUuid } = require("../utils/index");

const Schema = mongoose.Schema;

const LikeSchema = new Schema({
  likeId: {
    type: String,
    index: {
      unique: true,
    },
  },
  targetId: String,
  authorId: String,
  created: Date,
});

const LikeModel = mongoose.model("likes", LikeSchema);

/**
 * 新增一条点赞信息
 * @param {Object} likeObj { targetId: 点赞对象, authorId: 发起点赞的人 }
 */
const newLike = async (likeObj) => {
  let newer = new LikeModel({
    ...likeObj,
    likeId: getUuid(),
    created: Date.now(),
  });

  let res = await newer.save();

  if (!res) {
    return false;
  }
  return newer.toObject();
};

/**
 * 移除一条点赞记录
 * @param {String} targetId 目标Id
 * @param {String} authorId 点赞用户Id
 */
const delLike = async (targetId, authorId) => {
  let res = await LikeModel.deleteOne({ targetId, authorId });

  if (!res) {
    return false;
  } else {
    return true;
  }
};

/**
 * 获取点赞列表
 * @param {String} targetId 目标Id
 * @param {Number} limit 数量
 */
const getLikes = async (targetId, limit = 3) => {
  limit = Number(limit) || 3;

  let res = await LikeModel.find({ targetId })
    .limit(limit)
    .sort({ created: -1 });

  return res;
};

/**
 * 查看用户是否点赞
 * @param {String} targetId 目标Id
 * @param {String} authorId 点赞用户Id
 */
const isLiked = async (targetId, authorId) => {
  let res = await LikeModel.findOne({ targetId, authorId }, "_id");

  if (!res) {
    return false;
  }
  return true;
};

module.exports = {
  LikeModel,
  newLike,
  delLike,
  getLikes,
  isLiked,
};
