const mongoose = require("../utils/db");
const { getUuid } = require("../utils/index");

const Schema = mongoose.Schema;

const ArticleSchema = new Schema({
  author: String,
  banner: {
    type: String,
    default: "/img/a00bc7e1-e6f7-0528-ecb9-451e0ec0c9c5.jpg",
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
    type: String,
    index: {
      unique: true,
    },
    default: getUuid(),
  },
  tags: {
    type: Array,
    default: [],
  },
  status: {
    type: Number,
    default: 1,
  },
});

const ArticleModel = mongoose.model("articles", ArticleSchema);

module.exports = {
  ArticleModel,
};
