/**
 * 🛠 通用的工具方法
 */

const { getRedisVal, delRedisVal } = require("../utils/redis");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/index");

/**
 * 核对验证码
 * @param {String} sid sid值
 * @param {String} text 客户端发来的验证文本
 */
const checkCaptcha = async (sid, text) => {
  let result = await getRedisVal(sid);
  delRedisVal(sid);

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
  const payload = jwt.verify(token.split(" ")[1], JWT_SECRET);

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

module.exports = {
  checkCaptcha,
  getUuid,
  getJwtPaload,
  shuffle,
};
