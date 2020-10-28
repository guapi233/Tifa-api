const mongoose = require("../utils/db");

const Schema = mongoose.Schema;

const ArticleSchema = new Schema({
  author: Object,
  banner: {
    type: String,
    default: "/img/pic.png",
  },
  commentCount: {
    type: Number,
    default: 0,
  },
  likeCount: {
    type: Number,
    default: 0,
  },
  viewCount: {
    type: Number,
    default: 0,
  },
  created: {
    type: Date,
    default: Date.now(),
  },
  modified: {
    type: Date,
    default: Date.now(),
  },
  title: String,
  articleId: {
    type: Number,
    index: {
      unique: true,
    },
  },
});

const ArticleModel = mongoose.model("articles", ArticleSchema);

module.exports = {
  ArticleModel,
};
