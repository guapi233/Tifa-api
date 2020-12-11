const mongoose = require("../utils/db");
const { getUuid } = require("../utils/index");

const Schema = mongoose.Schema;

const SearchSchema = new Schema({
  searchId: {
    type: String,
    index: {
      unique: true,
    },
  },
  content: String,
  authorId: {
    type: String,
    default: "*",
  },
  count: {
    type: Number,
    default: 1,
  },
  created: Date,
});

const SearchModel = mongoose.model("searchs", SearchSchema);

/**
 * 新增一条点检索记录
 * @param {Object} searchObj { content: 检索内容, authorId: 谁检索的 }
 */
const newSearch = async (searchObj) => {
  const { content, authorId } = searchObj;

  // 检索相同内容及作者的记录是否已存在，如果存在，次数++
  let search = await SearchModel.findOne({ content, authorId });
  if (search) {
    search.count++;
  } else {
    search = new SearchModel({
      ...searchObj,
      searchId: getUuid(),
      created: Date.now(),
    });
  }

  const res = await search.save();

  if (!res) {
    return false;
  }

  return search.toObject();
};

/**
 * 获取类似的检索记录
 * @param {*} content 关键字
 */
const getSearch = async (content) => {
  content = new RegExp(`^${content}`);

  const res = await SearchModel.find({ content }, "-authorId")
    .sort({ count: -1 })
    .limit(10);

  return res;
};

module.exports = {
  SearchModel,
  newSearch,
  getSearch,
};
