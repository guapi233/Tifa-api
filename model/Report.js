const mongoose = require("../utils/db");
const { getUuid } = require("../utils/index");

const Schema = mongoose.Schema;

const ReportSchema = new Schema({
  reportId: {
    type: String,
    index: {
      unique: true,
    },
  },
  type: Number,
  category: Number,
  targetId: String,
  authorId: String,
  content: String,
  created: Date,
  status: {
    type: Number,
    default: 1,
  },
});

const ReportModel = mongoose.model("reports", ReportSchema);

/**
 * 添加一条举报信息
 * @param {Object} reportObj 举报信息对象
 */
const newReport = async (reportObj) => {
  let newer = new ReportModel({
    ...reportObj,
    reportId: getUuid(),
    created: Date.now(),
  });

  await newer.save();

  return true;
};

/**
 * 关闭对目标的所有举报
 * @param {*} reportId 举报Id
 * @param {*} oper 操作人
 */
const delReport = async (targetId, oper) => {
  // 1. 判断操作员是否为管理员

  // 2. 关闭举报
  await ReportModel.updateMany({ targetId }, { status: 0 });

  return true;
};

/**
 * 某个用户是否对某个对象进行过举报
 * @param {*} targetId
 * @param {*} authorId
 */
const existReport = async (targetId, authorId) => {
  let res = await ReportModel.findOne({ targetId, authorId, status: 1 }, "_id");

  if (!res) {
    return false;
  }
  return true;
};

/**
 * 查询举报详情
 * @param {*} reportId 举报Id
 * @param {*} oper 操作人
 */
const getReportDetail = async (reportId, oper) => {
  // 1. 校验是否为管理员

  // 2. 查询
  const res = await ReportModel.findOne({ reportId }, "-_id");

  return res ? res.toObject() : {};
};

module.exports = {
  ReportModel,
  newReport,
  delReport,
  existReport,
  getReportDetail,
};
