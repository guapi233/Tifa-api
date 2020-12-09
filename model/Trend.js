const mongoose = require("../utils/db");
const { getUuid } = require("../utils/index");

const Schema = mongoose.Schema;

const TrendSchema = new Schema({
  trendId: {
    type: String,
    index: {
      unique: true,
    },
  },
  type: Number,
  detailId: String,
  authorId: String,
  created: Date,
  status: {
    type: Number,
    default: 1,
  },
});

const TrendModel = mongoose.model("trends", TrendSchema);

/**
 * 新增一条动态信息
 * @param {Object} TrendObj { authorId: 发动态的人, detailId: 动态Id, type: 动态类型 }
 */
const newTrend = async (TrendObj) => {
  let newer = new TrendModel({
    ...TrendObj,
    trendId: getUuid(),
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
 * @param {String} detailId 需要被删除的动态详情Id
 */
const delTrend = async (detailId) => {
  let res = await TrendModel.updateOne({ detailId }, { status: 0 });

  return Boolean(res.n);
};

/**
 * 获取动态列表
 * @param {String} authorId 目标Id（支持以数组的形式传入多个）
 * @param {Number} skip 跳过的条目
 * @param {Number} limit 数量
 */
const getTrendList = async (authorId, skip = 0, limit = 20) => {
  skip = Number(skip) || 0;
  limit = Number(limit) || 20;

  authorId = authorId instanceof Array ? authorId : [authorId];

  let res = await TrendModel.find({
    authorId: {
      $in: authorId,
    },
    status: 1,
  })
    .skip(skip * limit)
    .limit(limit)
    .sort({ created: -1 });

  return res;
};

module.exports = {
  TrendModel,
  newTrend,
  delTrend,
  getTrendList,
};
