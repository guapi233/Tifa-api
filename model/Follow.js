const mongoose = require("mongoose");
const { getUuid } = require("../utils/index");

const Schema = mongoose.Schema;

const FollowSchema = new Schema({
  followId: {
    type: String,
    index: {
      unique: true,
    },
  },
  targetId: String,
  authorId: String,
  isRead: {
    type: Number,
    default: 0,
  },
  created: Date,
});

const FollowModel = mongoose.model("follows", FollowSchema);

// 新增关注字段
const newFollow = async (FollowObj) => {
  let newer = new FollowModel({
    ...FollowObj,
    followId: getUuid(),
    created: Date.now(),
  });

  let res = await newer.save();

  if (!res) {
    return false;
  }
  return newer.toObject();
};

// 删除一条关注字段（取消关注）
const delFollow = async (targetId, authorId) => {
  let res = await FollowModel.deleteOne({ targetId, authorId });

  if (!res) {
    return false;
  }
  return true;
};

// 判断是否已经关注
const isFollowed = async (targetId, authorId) => {
  let res = await FollowModel.findOne({ targetId, authorId });

  if (!res) {
    return false;
  }
  return true;
};

// 获取 我关注的人列表
const getFollowList = async (authorId, limit, skip) => {
  let res = await FollowModel.find({ authorId })
    .limit(limit)
    .skip(skip * limit)
    .sort({ created: -1 });

  return res;
};

// 获取 关注我的人列表
const getFollowedList = async (targetId, limit, skip) => {
  let res = await FollowModel.find({ targetId })
    .limit(limit)
    .skip(skip * limit)
    .sort({ created: -1 });

  return res;
};

/**
 * 获取未读的关注信息
 * @param {*} targetId 关注对象的作者Id
 * @param {*} count 是否只获取数量（默认false）
 */
const getUnReaders = async (targetId, count) => {
  let res = null;

  if (count) {
    res = await FollowModel.find({ targetId, isRead: 0 }).countDocuments();
  } else {
    res = await FollowModel.find({ targetId, isRead: 0 });
  }

  return res;
};

module.exports = {
  FollowModel,
  newFollow,
  delFollow,
  isFollowed,
  getFollowList,
  getFollowedList,
  getUnReaders,
};
