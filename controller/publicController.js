const svgCaptcha = require("svg-captcha");
const { setRedisVal } = require("../utils/redis");
const config = require("../config/index");
const { userIsExist, UserModel } = require("../model/User");
const { ArticleModel } = require("../model/Article");

class PublicController {
  // 获取验证码
  async getCaptcha(ctx) {
    const { sid } = ctx.query;

    if (!sid) {
      ctx.body = {
        isOk: 0,
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
      isOk: 1,
      data: newCaptcha.data,
    };
  }

  // 用户是否存在
  async userIsExist(ctx) {
    let { usernumber } = ctx.query;

    let result = await userIsExist({ usernumber });

    ctx.body = {
      isOk: 1,
      data: result,
    };
  }

  // 获取文章列表
  async getArticleList(ctx) {
    let { limit, skip } = ctx.query;

    // 1. 校验数据
    limit = Number(limit) ? Number(limit) : null;
    if (!Number(skip)) {
      skip = 0;
    }

    // 2. 筛选要读取的数据
    const filterList = ["-content"];
    const filterStr = filterList.join(" ");

    // 3. 读取数据
    let result = await ArticleModel.find({ status: 1 }, filterStr)
      .sort({ created: -1 })
      .skip(Number(skip))
      .limit(limit);

    ctx.body = {
      isOk: 1,
      data: result,
    };
  }

  // 获取文章详情
  async getArticleDetail(ctx) {
    // 1. 校验数据
    const { articleId } = ctx.query;

    if (!articleId) {
      ctx.body = {
        isOk: 0,
        data: "缺少必要的文章ID",
      };
      return;
    }

    // 2. 读取数据
    let result = await ArticleModel.findOne({ articleId, status: 1 });

    if (!result) {
      ctx.body = {
        isOk: 0,
        data: "您所访问文章不存在或已删除",
      };
      return;
    }
    result = result.toObject();

    // 3. 查询作者信息
    // 需要查询的用户数据
    let filterStr = "usernumber pic name summary";
    let userInfo = await UserModel.findOne(
      { usernumber: result.author },
      filterStr
    );

    if (!userInfo) {
      ctx.body = {
        isOk: 0,
        data: "您所访问文章不存在或已删除",
      };
    } else {
      userInfo = userInfo.toObject();
      result.author = userInfo;
      ctx.body = {
        isOk: 1,
        data: result,
      };
    }
  }

  // 获取用户公开信息
  async getUserInfo(ctx) {
    const { usernumber } = ctx.query;
    if (!usernumber) {
      ctx.body = {
        isOk: 0,
        data: "缺少必须的用户账号",
      };
      return;
    }

    // 查找 & 过滤用户信息
    const filterList = ["password", "_id"];

    let userInfo = await UserModel.findOne({ usernumber });
    if (!userInfo) {
      ctx.body = {
        isOk: 0,
        data: "用户不存在",
      };
      return;
    }

    userInfo = userInfo.toObject();

    filterList.forEach((key) => {
      delete userInfo[key];
    });

    ctx.body = {
      isOk: 1,
      data: userInfo,
    };
  }
}

module.exports = new PublicController();
