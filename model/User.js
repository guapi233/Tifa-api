const mongoose = require("../utils/db");

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  usernumber: { type: String, index: { unique: true } },
  password: String,
  name: {
    type: String,
    default: `萌豚${Date.now()}号`,
  },
  created: {
    type: Date,
  },
  gender: {
    type: Number,
    default: 2,
  },
  roles: {
    type: Array,
    default: [0],
  },
  pic: {
    type: String,
    default: "/img/pic.png",
  },
  mobile: {
    type: String,
    match: /^1[3-9](\d{9})$/,
    default: "",
  },
  email: {
    type: String,
    match: /^([a-zA-Z]|[0-9])(\w|-)+@[a-zA-Z0-9]+.([a-zA-Z]{2,4})$/,
    default: "",
  },
  status: {
    type: Number,
    default: 1,
  },
  summary: {
    type: String,
    default: "",
  },
  title: {
    type: Array,
    default: [0],
  },
  follow: {
    type: Number,
    default: 0,
  },
  followed: {
    type: Number,
    default: 0,
  },
  occupation: {
    type: String,
    default: "",
  },
  interest: {
    type: String,
    default: "",
  },
  systemCount: Number,
  dailyNotice: {
    type: Number,
    default: 1,
  },
  importNotice: {
    type: Number,
    default: 1,
  },
  trendVisible: {
    type: Number,
    default: 1,
  },
  collectionVisible: {
    type: Number,
    default: 1,
  },
  alias: String,
});

const UserModel = mongoose.model("users", UserSchema);

/**
 * 查询 一个用户 是否存在
 * @param {object} requirement 查询条件
 */
const userIsExist = (requirement) => {
  return new Promise((resolve, reject) => {
    UserModel.findOne(requirement, "usernumber", (err, doc) => {
      if (doc && doc.usernumber) {
        return resolve(true);
      }

      resolve(false);
    });
  });
};

/**
 * 新建一个用户，并返回承载用户信息的对象
 * @param {Object} userInfoObj 用户信息对象
 * @returns {Object} 用户信息
 */
const newUser = async (userInfoObj) => {
  // 系统通知数量
  const systemCount = await getSystemMesCount();

  let newer = new UserModel({
    ...userInfoObj,
    created: Date.now(),
    systemCount,
  });
  let res = await newer.save();

  if (!res) {
    return false;
  }
  return newer.toObject();
};

/**
 * 获取一个用户的信息（经过筛选后的）
 * @param {*} usernumber
 */
const getUserInfo = async (usernumber) => {
  const res = await UserModel.findOne({ usernumber }, "-password");
  console.log(res);

  return res;
};

module.exports = {
  UserModel,
  userIsExist,
  newUser,
  getUserInfo,
};

const { getSystemMesCount } = require("../model/System");
