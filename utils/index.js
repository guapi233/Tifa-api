/**
 * 🛠 通用的工具方法
 */

const { getRedisVal, delRedisVal } = require("../utils/redis");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/index");
const bcrypt = require("bcrypt");

/**
 * （异步方法）核对验证码（核对完毕后会删除验证码）
 * @param {String} sid sid值
 * @param {String} text 客户端发来的验证文本
 * @param {Boolean} del 是否删除（默认删除)
 */
const checkCaptcha = async (sid, text, del = true) => {
  let result = await getRedisVal(sid);
  del && delRedisVal(sid);

  if (!result) return false;

  return result.toLowerCase() === text.toLowerCase();
};

/**
 * 生成UUID
 */
const getUuid = () => {
  return uuidv4();
};

/**
 * 获取 JWT payload
 * @param token 令牌
 */
const getJwtPaload = (token) => {
  let payload = {};

  try {
    payload = jwt.verify(token.split(" ")[1], JWT_SECRET);
  } catch (err) {
    // noop
  }

  // 判断是否过期（这里的判断没有必要，因为过期的token已经被 koa-jwt 拦截下了）
  // if (payload.exp * 1000 < Date.now()) return false;
  return payload;
};

/**
 * 洗牌算法
 * @param arr 数组
 */
const shuffle = (arr) => {
  if (!arr.length) return [];

  arr = [...arr];
  let i = arr.length;

  while (--i) {
    let j = Math.floor(Math.random() * i);
    [arr[j], arr[i]] = [arr[i], arr[j]];
  }

  return arr;
};

/**
 * 是否为undefined
 * @param {*} value 值
 */
const isUndefined = (value) => {
  return typeof value === "undefined";
};

/**
 * 是否为数字
 * @param {*} value 值
 */
const isNumber = (value) => {
  return typeof value === "number" && !isNaN(value);
};

/**
 * 判断时间戳是否过期
 * @param date 时间戳
 */
const isOverdue = (date) => {
  if (isNaN(date)) return true;

  return Date.now() >= date;
};

/**
 * 是否是一个有效的邮箱
 * @param str 字符串
 */
const isEmail = (str) => {
  return /^([a-zA-Z]|[0-9])(\w|-)+@[a-zA-Z0-9]+.([a-zA-Z]{2,4})$/.test(str);
};

/**
 * 比较密码是否一致
 * @param {*} password 密码
 * @param {*} target 已经加密的密码
 */
const comparePassword = (password, target) => {
  return bcrypt.compareSync(password, target);
};

/**
 * 加密密码
 * @param {*} password 密码
 */
const encrptPassword = (password) => {
  return bcrypt.hashSync(password, 5);
};

module.exports = {
  checkCaptcha,
  getUuid,
  getJwtPaload,
  shuffle,
  isUndefined,
  isNumber,
  isOverdue,
  isEmail,
  comparePassword,
  encrptPassword,
};
