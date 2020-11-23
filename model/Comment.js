const mongoose = require("../utils/db");
const { getUuid } = require("../utils/index.js");
const { UserModel } = require("./User");

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
    "usernumber name pic title"
  );

  // 当前文章/回复的评论数量 + 1 （由前端来做）

  return newer;
};

module.exports = {
  CommentModel,
  newComment,
};
