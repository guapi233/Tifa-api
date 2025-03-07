const mongoose = require("../utils/db");

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
const updateDraft = (draftObj, authorId) => {
  const { draftId, title, banner, content, words } = draftObj;

  const setter = { draftId, title, banner, updated: Date.now() };
  typeof content !== "undefined" && (setter.content = content);
  typeof words !== "undefined" && (setter.words = words);

  DraftModel.updateOne({ draftId, authorId }, setter, (err) => {});

  return true;
};

// 查询草稿是否存在
const draftIsExist = async (draftId, authorId) => {
  let res = await DraftModel.findOne({ draftId, authorId }, "_id status");

  // 重新打开该更新草稿
  if (res && !res.status) {
    res.status = 1;
    await res.save();
  }

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
  ).sort({ updated: -1 });

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
