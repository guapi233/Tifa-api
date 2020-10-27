const router = require("koa-router")();
const jsonwebtoken = require("jsonwebtoken");
const config = require("../config/index");
const { checkCaptcha } = require("../utils/index");
const { UserModel } = require("../model/User");
const bcrypt = require("bcrypt");

router.prefix("/login");

router.post("/", async (ctx) => {
  const { sid, usernumber, password, captcha } = ctx.request.body;

  // 1. 校验验证码
  let result = await checkCaptcha(sid, captcha);

  if (!result) {
    ctx.body = {
      isOk: 0,
      data: "验证码过期或填写错误",
    };
    return;
  }

  // 2. 校验账号密码
  result = await UserModel.findOne({ usernumber });
  const userInfo = result.toObject();

  if (!result || !bcrypt.compareSync(password, result.password)) {
    ctx.body = {
      isOk: 0,
      data: "账号或密码错误",
    };
    return;
  }

  // 3. 根据结构创建token 并返回结果
  let token = jsonwebtoken.sign({ _id: "Mob" }, config.JWT_SECRET, {
    expiresIn: "1d",
  });

  // 4. 过滤用户信息
  const filterList = ["password"];
  filterList.map((key) => {
    delete userInfo[key];
  });

  ctx.body = {
    isOk: 1,
    token,
    data: userInfo,
  };
});

module.exports = router;
