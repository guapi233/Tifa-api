const svgCaptcha = require("svg-captcha");
const { setRedisVal } = require("../utils/redis");
const config = require("../config/index");
const { userIsExist } = require("../model/User");
const { ArticleModel } = require("../model/Article");

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

  // 用户是否存在
  async userIsExist(ctx) {
    let { usernumber } = ctx.query;

    let result = await userIsExist({ usernumber });

    ctx.body = {
      isOk: Number(result),
      data: result,
    };
  }

  // 获取文章列表
  async getArticleList(ctx) {
    let { limit, skip } = ctx.query;

    // 1. 校验数据
    if (!Number(limit) && Number(limit) !== 0) {
      limit = 0;
    }
    if (!Number(skip) && Number(skip) !== 0) {
      skip = 0;
    }

    // 2. 筛选要读取的数据
    const filterList = ["-content"];
    const filterStr = filterList.join(" ");

    // 3. 读取数据
    let result = await ArticleModel.find({}, filterStr)
      .sort({ created: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    ctx.body = {
      isOk: 1,
      data: result,
    };
  }
}

module.exports = new PublicController();
