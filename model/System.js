const mongoose = require("mongoose");
const { UserModel } = require("../model/User");

const Schema = mongoose.Schema;

const SystemSchema = new Schema({
  systemId: {
    type: Number,
    index: {
      unique: true,
    },
  },
  targetId: String,
  authorId: String,
  title: String,
  content: String,
  created: Date,
});

const SystemModel = mongoose.model("systems", SystemSchema);

/**
 * 获取全部的系统通知数量
 * @param {Array} targetIds 通知对象（数组）
 */
const getSystemMesCount = async () => {
  const res = await SystemModel.find().countDocuments();

  return res;
};

/**
 * 新建一条系统通知
 * @param {*} systemObj 通知信息对象
 */
const newSystemMes = async (systemObj, authorId) => {
  // 校验 authorId 是否为管理员

  // 查询当前系统通知的数量，+1后作为当前的systemId
  let systemId = await getSystemMesCount();
  systemId++;

  let newer = new SystemModel({
    ...systemObj,
    authorId,
    systemId,
    created: Date.now(),
  });

  try {
    await newer.save();
  } catch (err) {
    return false;
  }

  return newer.toObject();
};

/**
 * 查询未读的系统通知数量
 * @param {*} targetId 查询用户Id
 */
const getUnReaders = async (usernumber) => {
  // 读取用户最新阅读的通知
  let readerNumber = await UserModel.findOne(
    { usernumber },
    "-_id systemCount"
  );
  try {
    readerNumber = readerNumber.systemCount || 0;
  } catch (err) {
    readerNumber = 0;
  }

  let systems = await SystemModel.find({
    systemId: { $gt: readerNumber },
    targetId: { $in: ["*", usernumber] },
  }).countDocuments();

  return systems;
};

module.exports = {
  SystemModel,
  newSystemMes,
  getUnReaders,
  getSystemMesCount,
};
