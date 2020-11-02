const { UserModel } = require("../model/User");

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

    console.log(res);

    if (res) {
      ctx.body = {
        isOk: 1,
        data: true,
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
    const { usernumber } = ctx.query;
    // 1. 解析图片路径
    path = path.split("\\");
    path = `/${path[path.length - 2]}/${path[path.length - 1]}`;
    console.log(path);

    // 2. 替换用户数据
    let res = await UserModel.updateOne(
      { usernumber },
      {
        pic: path,
      }
    );

    // 3.根据结果返回数据
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
