const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const CollectionSchema = new Schema({
  collectionId: {
    type: String,
    index: {
      unique: true,
    },
  },
  targetId: String,
  authorId: String,
  created: Date,
});

const CollectionModel = mongoose.model("collections", CollectionSchema);

// 新增收藏
const newCollection = async (collectionObj) => {
  const { targetId, authorId } = collectionObj;

  let newer = new CollectionModel({
    targetId,
    authorId,
  });

  let res = await newer.save();

  if (!res) {
    return false;
  }
  return newer.toObject();
};

// 是否已经收藏
const isCollected = async (targetId, authorId) => {
  let res = await CollectionModel.findOne({ targetId, authorId }, "_id");

  if (!res) {
    return false;
  }
  return true;
};

// 删除一条收藏记录（取消收藏）
const delCollection = async (targetId) => {
  let res = await CollectionModel.deleteOne({ targetId });

  if (!res) {
    return false;
  }
  return true;
};

// 获取收藏列表
const getCollections = async (authorId) => {
  let res = await CollectionModel.find({ authorId });

  return res;
};

module.exports = {
  CollectionModel,
  newCollection,
  isCollected,
  delCollection,
  getCollections,
};
