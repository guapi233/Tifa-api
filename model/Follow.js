const mongoose = require("../utils/db");
const { getUuid } = require("../utils/index");
const { UserModel } = require("./User");
const { newTrend, delTrend } = require("./Trend");

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

  // 添加动态
  await newTrend({
    type: 3,
    detailId: newer.followId,
    authorId: newer.authorId,
  });

  return newer.toObject();
};

// 删除一条关注字段（取消关注）
const delFollow = async (targetId, authorId) => {
  let follow = await FollowModel.findOne({ targetId, authorId });
  if (!follow) return true;

  let res = await FollowModel.deleteOne({ targetId, authorId });

  if (!res) {
    return false;
  }

  // 关闭动态
  delTrend(follow.followId);
  return true;
};

// 判断是否已经关注
const isFollowed = async (targetId, authorId) => {
  let res = await FollowModel.findOne({ targetId, authorId });

  return res ? true : false;
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

/**
 * 取关
 * @param {*} targetId 目标
 * @param {*} usernumber 发起者
 * @param {*} mutual 是否互相取关（默认false）
 */
const cancelFollow = async (targetId, usernumber, mutual = false) => {
  const follow = await FollowModel.findOne({ targetId, authorId: usernumber });

  if (follow) {
    await delFollow(targetId, usernumber);
    // 关注数量--，目标用户粉丝数量--
    await UserModel.updateOne(
      { usernumber },
      {
        $inc: {
          follow: -1,
        },
      }
    );
    await UserModel.updateOne(
      { usernumber: targetId },
      {
        $inc: {
          followed: -1,
        },
      }
    );
    // 关闭动态
    delTrend(follow.followId);
  }

  if (mutual) {
    [targetId, usernumber] = [usernumber, targetId];

    const follow = await FollowModel.findOne({
      targetId,
      authorId: usernumber,
    });

    if (follow) {
      await delFollow(targetId, usernumber);
      // 关注数量--，目标用户粉丝数量--
      await UserModel.updateOne(
        { usernumber },
        {
          $inc: {
            follow: -1,
          },
        }
      );
      await UserModel.updateOne(
        { usernumber: targetId },
        {
          $inc: {
            followed: -1,
          },
        }
      );
      // 关闭动态
      delTrend(follow.followId);
    }
  }
};

module.exports = {
  FollowModel,
  newFollow,
  isFollowed,
  getFollowList,
  getFollowedList,
  getUnReaders,
  cancelFollow,
};
