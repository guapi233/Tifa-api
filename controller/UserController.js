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
}

module.exports = new UserController();
