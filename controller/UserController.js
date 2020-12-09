const { UserModel, getUserInfo } = require("../model/User");
const {
  getJwtPaload,
  isNumber,
  checkCaptcha,
  comparePassword,
  encrptPassword,
  fail,
  suc,
} = require("../utils/index");
const { isFollowed, newFollow, cancelFollow } = require("../model/Follow");
const {
  newBlacklisted,
  isBlackListed,
  delBlacklisted,
  getBlacklistedList,
} = require("../model/BlackListed");
const { emitFollow, emitSetting } = require("../utils/socket");

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

    // 1.1 判断是否被拉黑了
    const black = await isBlackListed(usernumber, targetId);
    if (black) {
      return (ctx.body = {
        isOk: 0,
        data: "关注失败",
      });
    }

    // 2. 判断是否已经关注
    const followed = await isFollowed(targetId, usernumber);
    if (followed) {
      await cancelFollow(targetId, usernumber);

      ctx.body = {
        isOk: 1,
        data: "取消关注",
      };

      // 推送通知
      emitFollow(targetId, -1);
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

  // 用户消息通知设置
  async setNotice(ctx) {
    let { dailyNotice, importNotice } = ctx.request.body;
    const { usernumber } = getJwtPaload(ctx.header["authorization"]);

    const res = await getUserInfo(usernumber);
    res.dailyNotice = dailyNotice;
    res.importNotice = importNotice;
    await res.save();
    console.log(typeof dailyNotice, dailyNotice, res.dailyNotice);

    ctx.body = {
      isOk: 1,
      data: res,
    };
  }

  // 拉黑一个人
  async setBlacklisted(ctx) {
    const { targetId } = ctx.query;
    const { usernumber: authorId } = getJwtPaload(ctx.header["authorization"]);

    // 1. 判断是否已经拉黑
    const black = await isBlackListed(targetId, authorId);
    let msg = "";

    if (black) {
      // 2. 取消拉黑
      const res = await delBlacklisted(black.blacklistedId);
      res && (msg = "取消屏蔽");
    } else {
      const res = await newBlacklisted({
        targetId,
        authorId,
      });
      res && (msg = "成功屏蔽此用户");

      // 互相取关
      cancelFollow(targetId, authorId, true);
    }

    ctx.body = {
      isOk: 1,
      data: msg,
    };
  }

  // 获取我拉黑的列表
  async getBlacklistedList(ctx) {
    let { skip, limit } = ctx.query;
    skip = Number(skip) || 0;
    limit = Number(limit) || 20;

    const payload = getJwtPaload(ctx.header["authorization"]);
    let res = await getBlacklistedList(payload.usernumber, false, skip, limit);

    // 添加附加信息
    for (let i = 0; i < res.length; i++) {
      const item = res[i];
      res[i] = await UserModel.findOne(
        { usernumber: item },
        "usernumber pic name"
      );
    }

    ctx.body = {
      isOk: 1,
      data: res,
    };
  }

  // 修改偏好
  async setMinePre(ctx) {
    let { trendVisible, collectionVisible } = ctx.request.body;
    trendVisible = Number(trendVisible);
    collectionVisible = Number(collectionVisible);
    const { usernumber } = getJwtPaload(ctx.header["authorization"]);
    if (!isNumber(trendVisible) || !isNumber(collectionVisible)) {
      return (ctx.body = {
        isOk: 0,
        data: "操作失败",
      });
    }

    const res = await UserModel.updateOne(
      { usernumber },
      { trendVisible, collectionVisible }
    );

    ctx.body = {
      isOk: 1,
      data: res.n,
    };
  }

  // 绑定邮箱
  async setEmail(ctx) {
    const { usernumber, email, sid, verifyCode } = ctx.query;

    // 1. 验证验证码
    if (!(await checkCaptcha(sid, verifyCode))) {
      return (ctx.body = {
        isOk: 0,
        data: "邮箱绑定失败，请关闭窗口",
      });
    }

    // 2. 判断邮箱是否存在
    const user = await UserModel.findOne({ email });
    if (user) {
      return (ctx.body = {
        isOk: 0,
        data: "该邮箱已被占用",
      });
    }

    // 3. 绑定邮箱
    const res = await UserModel.updateOne({ usernumber }, { email });

    // 4. 通知前端更新
    res.n && emitSetting(usernumber);

    ctx.body = {
      isOk: res.n,
      data: res.n ? "绑定邮箱成功，请关闭窗口" : "绑定邮箱失败，请关闭窗口",
    };
  }

  // 修改密码
  async setPassword(ctx) {
    let { oldPassword, newPassword, verifyCode, sid, usernumber } = ctx.query;
    usernumber = usernumber || ctx.usernumber;

    if ((!oldPassword && (!verifyCode || !sid)) || !usernumber) {
      return (ctx.body = {
        isOk: 0,
        data: "修改失败",
      });
    } else if (oldPassword) {
      // 根据密码修改
      const user = await UserModel.findOne({ usernumber });

      // 校验密码
      if (!comparePassword(oldPassword, user.password)) {
        return (ctx.body = {
          isOk: 0,
          data: "修改失败",
        });
      }

      // 修改密码
      user.password = encrptPassword(newPassword);
      await user.save();

      ctx.body = {
        isOk: 1,
        data: "修改成功",
      };
    } else if (verifyCode && sid) {
      // 根据验证码修改
      // 校验验证码
      if (!(await checkCaptcha(sid, verifyCode))) {
        return (ctx.body = {
          isOk: 0,
          data: "验证码错误",
        });
      }

      // 修改密码
      const res = await UserModel.updateOne(
        { usernumber },
        { password: encrptPassword(newPassword) }
      );

      ctx.body = {
        isOk: res.n,
        data: res.n ? "修改成功" : "修改失败",
      };
    }
  }

  // 设置个性域名
  async setAlias(ctx) {
    const { alias } = ctx.query;
    const usernumber = ctx.usernumber;

    // 判断 alias 是否已被注册
    const running = await UserModel.findOne({ alias }, "usernumber");
    if (running && running.usernumber === usernumber) {
      return fail(ctx, "您已绑定个性域名");
    } else if (running) {
      return fail(ctx, "该个性域名已被占用");
    }

    // 查询用户是否已绑定 alias
    const user = await UserModel.findOne({ usernumber }, "alias");
    if (user.alias) {
      return fail(ctx, "您已绑定个性域名");
    }

    // 设置
    user.alias = alias;
    await user.save();
    suc(ctx, "设置成功");
  }
}

module.exports = new UserController();
