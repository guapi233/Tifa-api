const mongoose = require("../utils/db");
const { getUuid } = require("../utils/index.js");

const Schema = mongoose.Schema;

const CommentSchema = new Schema({
  commentId: {
    type: String,
    default: getUuid(),
    index: {
      unique: true,
    },
  },
  targetId: String,
  replyId: String,
  authorId: String,
  created: {
    type: Date,
    default: Date.now(),
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
  let newer = new CommentModel(commentObj);
  let res = await newer.save();

  if (!res) {
    return false;
  }

  return newer.toObject();
};

module.exports = {
  CommentModel,
  newComment,
};
