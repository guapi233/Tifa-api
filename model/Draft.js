const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const DraftSchema = new Schema({
  draftId: {
    type: String,
    index: {
      unique: true,
    },
  },
  title: String,
  authorId: String,
  created: Date,
  updated: Date,
  banner: String,
  content: String,
  words: {
    type: Number,
    default: 0,
  },
  status: {
    type: Number,
    default: 1,
  },
});

const DraftModel = mongoose.model("drafts", DraftSchema);

// 新建草稿
const newDraft = async (draftObj) => {
  let newer = new DraftModel({
    ...draftObj,
    created: Date.now(),
    updated: Date.now(),
  });

  let res = await newer.save();

  if (!res) {
    return false;
  }
  return newer.toObject();
};

// 删除草稿
const delDraft = async (draftId, authorId) => {
  let res = await DraftModel.updateOne({ draftId, authorId }, { status: 0 });

  if (!res.n) {
    return false;
  }
  return true;
};

// 更新草稿
const updateDraft = async (draftObj, authorId) => {
  const { draftId, title, banner, content } = draftObj;

  let res = await DraftModel.updateOne(
    { draftId, authorId },
    { title, banner, content, updated: Date.now() }
  );

  return true;
};

// 查询草稿是否存在
const draftIsExist = async (draftId, authorId) => {
  let res = await DraftModel.findOne({ draftId, status: 1, authorId }, "_id");

  if (!res) {
    return false;
  }
  return true;
};

// 查询草稿列表
const getDraftList = async (authorId) => {
  let res = await DraftModel.find(
    { authorId, status: 1 },
    "-content -status"
  ).sort({ created: -1 });

  return res;
};

// 查询草稿详情
const getDraftDetail = async (draftId, authorId) => {
  let res = await DraftModel.findOne(
    { draftId, status: 1, authorId },
    "-status"
  );

  if (!res) {
    return false;
  }
  return res.toObject();
};

module.exports = {
  DraftModel,
  newDraft,
  delDraft,
  updateDraft,
  draftIsExist,
  getDraftList,
  getDraftDetail,
};
