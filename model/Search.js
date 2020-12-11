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

module.exports = {
  SearchModel,
  newSearch,
};
