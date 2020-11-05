const { checkCaptcha } = require("../utils/index");
const { UserModel, userIsExist, newUser } = require("../model/User");
const bcrypt = require("bcrypt");
const jsonwebtoken = require("jsonwebtoken");
const config = require("../config/index");

class LoginController {
  // 登录
  async login(ctx) {
    const { sid, usernumber, password, captcha } = ctx.request.body;

    // 1. 校验验证码
    if (!sid) {
      ctx.body = {
        isOk: 0,
        data: "缺少必要的 sid 值",
      };
      return;
    }

    let result = await checkCaptcha(sid, captcha);

    if (!result) {
      ctx.body = {
        isOk: 0,
        data: "验证码过期或填写错误",
      };
      return;
    }

    // 2. 校验账号密码
    result = await UserModel.findOne({ usernumber, status: 1 });
    const userInfo = result ? result.toObject() : null;

    if (!result || !bcrypt.compareSync(password, result.password)) {
      ctx.body = {
        isOk: 0,
        data: "账号或密码错误",
      };
      return;
    }

    // 3. 根据结构创建token 并返回结果
    let token = jsonwebtoken.sign({ usernumber }, config.JWT_SECRET, {
      expiresIn: "1d",
    });

    // 4. 过滤用户信息
    const filterList = ["password"];
    filterList.map((key) => {
      delete userInfo[key];
    });

    ctx.body = {
      isOk: 1,
      data: {
        userInfo,
        token,
      },
    };
  }

  // 注册
  async register(ctx) {
    const { sid, usernumber, password, captcha } = ctx.request.body;

    // 1. 校验验证码 以及 账号密码是否合法
    if (!sid) {
      ctx.body = {
        isOk: 0,
        data: "缺少必要的 sid 值",
      };
      return;
    }

    let result = await checkCaptcha(sid, captcha);

    if (!result) {
      ctx.body = {
        isOk: 0,
        data: "验证码过期或填写错误",
      };
      return;
    }

    if (
      usernumber.length < 6 ||
      usernumber.length > 20 ||
      password.length < 6 ||
      password.length > 20
    ) {
      ctx.body = {
        isOk: 0,
        data: "账号或密码的长度不符合要求",
      };
      return;
    }

    // 2. 校验账号是否存在
    result = await userIsExist({ usernumber });

    if (result) {
      ctx.body = {
        isOk: 0,
        data: "账号已经存在",
      };
      return;
    }

    // 3. 创建用户
    const userInfo = newUser({
      usernumber,
      password: bcrypt.hashSync(password, 5),
    });
    if (!userInfo) {
      ctx.body = {
        isOk: 0,
        data: "注册失败",
      };
    }

    // 4. 根据结构创建token 并返回结果
    let token = jsonwebtoken.sign({ usernumber }, config.JWT_SECRET, {
      expiresIn: "1d",
    });

    // 5. 过滤用户信息
    const filterList = ["password"];
    filterList.map((key) => {
      delete userInfo[key];
    });

    ctx.body = {
      isOk: 1,
      data: {
        userInfo,
        token,
      },
    };
  }
}

module.exports = new LoginController();
