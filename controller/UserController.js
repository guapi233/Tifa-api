const jwt = require("koa-jwt");
const { UserModel } = require("../model/User");
const { getJwtPaload } = require("../utils/index");

class UserController {
  // 编辑资料
  async edit(ctx) {
    let {
      usernumber,
      name,
      occupation,
      gender,
      interest,
      summary,
    } = ctx.request.body;

    if (!name) {
      ctx.body = {
        isOk: 0,
        data: "缺少必须的 名称",
      };
      return;
    }

    occupation = occupation || "";
    interest = interest || "";
    summary = summary || "";

    let res = await UserModel.updateOne(
      { usernumber },
      {
        name,
        occupation,
        gender,
        interest,
        summary,
      }
    );

    if (res) {
      ctx.body = {
        isOk: 1,
        data: "更新成功",
      };
    } else {
      ctx.body = {
        isOk: 0,
        data: "更新失败",
      };
    }
  }

  // 上传头像
  async uploadPic(ctx) {
    let { path } = ctx.request.files.file;
    // 1. 解析 jwt 获取token
    let payload = await getJwtPaload(ctx.header["authorization"]);
    if (!payload) {
      ctx.body = {
        isOk: 0,
        data: "登录已过期，请您重新登录",
      };
      return;
    }
    const { usernumber } = payload;

    // 2. 解析图片路径
    path = path.split("\\");
    path = `/${path[path.length - 2]}/${path[path.length - 1]}`;

    // 3. 替换用户数据
    let res = await UserModel.updateOne(
      { usernumber },
      {
        pic: path,
      }
    );

    // 4.根据结果返回数据
    if (res.nModified) {
      ctx.body = {
        isOk: 1,
        data: "上传成功",
      };
    } else {
      ctx.body = {
        isOk: 0,
        data: "上传失败",
      };
    }
  }
}

module.exports = new UserController();
