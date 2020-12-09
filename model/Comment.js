const mongoose = require("../utils/db");
const { getUuid } = require("../utils/index.js");
const { UserModel } = require("./User");
const { newTrend, delTrend } = require("./Trend");

const Schema = mongoose.Schema;

const CommentSchema = new Schema({
  commentId: {
    type: String,
    index: {
      unique: true,
    },
  },
  targetId: String,
  replyId: String,
  replySec: {
    type: String,
    default: "",
  },
  authorId: String,
  created: {
    type: Date,
  },
  content: String,
  likeCount: {
    type: Number,
    default: 0,
  },
  commentCount: {
    type: Number,
    default: 0,
  },
  isRead: {
    type: Number,
    default: 0,
  },
  targetAuthor: String,
  type: Number,
  status: {
    type: Number,
    default: 1,
  },
});

const CommentModel = mongoose.model("comments", CommentSchema);

/**
 * 添加评论（异步）
 * @param {object} commentObj 评论信息
 */
const newComment = async (commentObj) => {
  let newer = new CommentModel({
    ...commentObj,
    commentId: getUuid(),
    created: Date.now(),
  });
  let res = await newer.save();

  if (!res) {
    return false;
  }

  // 查询评论作者信息
  newer = newer.toObject();
  newer.author = await UserModel.findOne(
    { usernumber: newer.authorId },
    "usernumber name pic title targetAuthor"
  );

  // 将新评论的 children 置为空
  newer.children = [];

  // 当前文章/回复的评论数量 + 1 （由前端来做）

  // 添加动态
  await newTrend({
    type: 2,
    detailId: newer.commentId,
    authorId: newer.authorId,
  });

  return newer;
};

/**
 * 获取未读的评论列表
 * @param {*} replyId 评论对象的作者Id
 * @param {*} count 是否只获取数量（默认false）
 */
const getUnReaders = async (replyId, count) => {
  let res = null;

  if (count) {
    res = await CommentModel.find({ replyId, isRead: 0 }).countDocuments();
  } else {
    res = await CommentModel.find({ replyId, isRead: 0 });
  }

  return res;
};

module.exports = {
  CommentModel,
  newComment,
  getUnReaders,
};
