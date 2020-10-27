const svgCaptcha = require("svg-captcha");
const { setRedisVal } = require("../utils/redis");
const config = require("../config/index");

class PublicController {
  // 获取验证码
  async getCaptcha(ctx) {
    const { sid } = ctx.query;

    if (!sid) {
      ctx.body = {
        status: 401,
        data: "create fail：没有收到必须的 sid 值。",
      };

      return;
    }

    // 生成验证码
    const newCaptcha = svgCaptcha.create({
      size: 4,
      ignoreChars: "0oO1ilLI",
      color: true,
      noise: Math.floor(Math.random() * 5),
      width: 150,
      height: 38,
    });

    // 将 sid 与 验证文字 写入 Redis，设置过期时间
    setRedisVal(sid, newCaptcha.text, config.CAPTCHA_LIFE);

    ctx.body = {
      status: 200,
      data: newCaptcha.data,
    };
  }
}

module.exports = new PublicController();
