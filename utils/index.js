/**
 * 通用的工具方法
 */
const { getRedisVal } = require("../utils/redis");

/**
 * 核对验证码
 * @param {String} sid sid值
 * @param {String} text 客户端发来的验证文本
 */
const checkCaptcha = async (sid, text) => {
  let result = await getRedisVal(sid);

  return result.toLowerCase() === text.toLowerCase();
};

module.exports = {
  checkCaptcha,
};
