/**
 * 通用的工具方法
 */
const { getRedisVal, delRedisVal } = require("../utils/redis");
const { v4: uuidv4 } = require("uuid");

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

module.exports = {
  checkCaptcha,
  getUuid,
};
