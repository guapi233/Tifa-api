const mongoose = require("../utils/db");

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  usernumber: { type: String, index: { unique: true } },
  password: String,
  name: String,
  created: {
    type: Date,
    default: Date.now(),
  },
  gender: Number,
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
  status: {
    type: Number,
    default: 1,
  },
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

module.exports = {
  UserModel,
  userIsExist,
};
