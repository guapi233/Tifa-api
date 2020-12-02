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
  commentAllow: {
    type: Number,
    default: 1,
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
  },
  modified: {
    type: Date,
  },
  title: String,
  articleId: {
    type: String,
    index: {
      unique: true,
    },
  },
  tags: {
    type: Array,
    default: [],
  },
  status: {
    type: Number,
    default: 1,
  },
  content: String,
});

const ArticleModel = mongoose.model("articles", ArticleSchema);

/**
 * 新建一篇文章，并返回承载文章信息的对象
 * @param {Object} articleObj 文章信息对象
 * @returns {Object} 文章信息
 */
const newArticle = async (articleObj) => {
  let newer = new ArticleModel({
    ...articleObj,
    articleId: getUuid(),
    created: Date.now(),
    modified: Date.now(),
  });
  let res = await newer.save();

  if (!res) {
    return false;
  }
  return newer.toObject();
};

/**
 * 删除一篇文章，返回删除的结构
 * @param {*} articleId 文章Id
 * @param {*} author 当前用户（用户判定是否为作者）
 */
const delArticle = async (articleId, author) => {
  let res = await ArticleModel.updateOne({ articleId, author }, { status: 0 });

  if (!res.n) {
    return false;
  }
  return true;
};

/**
 * 编辑文章
 * @param {*} articleObj 文章信息对象
 * @param {*} author 作者（当前用户）
 */
const modifyArticle = async (articleObj, author) => {
  const { articleId } = articleObj;
  await ArticleModel.updateOne({ articleId, author, status: 1 }, articleObj);

  return true;
};

module.exports = {
  ArticleModel,
  newArticle,
  delArticle,
  modifyArticle,
};
