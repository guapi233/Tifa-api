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

module.exports = {
  CommentModel,
};
