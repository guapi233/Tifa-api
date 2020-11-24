const { UserModel } = require("../model/User");
const { getJwtPaload } = require("../utils/index");
const { isFollowed, delFollow, newFollow } = require("../model/Follow");
const { emitFollow } = require("../utils/socket");

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

  // 添加关注
  async addFollow(ctx) {
    // 1. 获取参数 & 校验信息
    const { targetId } = ctx.query;
    const { usernumber } = getJwtPaload(ctx.header["authorization"]);
    if (!targetId || !usernumber) {
      ctx.body = {
        isOk: 0,
        data: "缺少必要的信息",
      };
      return;
    } else if (targetId === usernumber) {
      ctx.body = {
        isOk: 0,
        data: "自己不能关注自己哦",
      };
      return;
    }

    // 2. 判断是否已经关注
    const followed = await isFollowed(targetId, usernumber);
    if (followed) {
      await delFollow(targetId, usernumber);
      // 关注数量--，目标用户粉丝数量--
      await UserModel.updateOne(
        { usernumber },
        {
          $inc: {
            follow: -1,
          },
        }
      );
      await UserModel.updateOne(
        { usernumber: targetId },
        {
          $inc: {
            followed: -1,
          },
        }
      );
      ctx.body = {
        isOk: 1,
        data: "取消关注",
      };
      return;
    }

    // 3. 新建关注信息
    const newer = await newFollow({
      targetId,
      authorId: usernumber,
    });
    if (!newer) {
      ctx.body = {
        isOk: 0,
        data: "关注失败",
      };
      return;
    }

    // 4. 关注数量++，目标用户粉丝数量++
    await UserModel.updateOne(
      { usernumber },
      {
        $inc: {
          follow: 1,
        },
      }
    );
    await UserModel.updateOne(
      { usernumber: targetId },
      {
        $inc: {
          followed: 1,
        },
      }
    );

    // 5. 推送通知
    emitFollow(targetId);

    ctx.body = {
      isOk: 1,
      data: newer,
    };
  }
}

module.exports = new UserController();
