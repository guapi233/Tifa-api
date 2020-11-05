const { newComment } = require("../model/Comment");
const { getJwtPaload } = require("../utils/index");

class ContentController {
  // 添加评论信息
  async addComment(ctx) {
    let { targetId, replyId, content } = ctx.request.body;

    // 1. 校验信息
    if (!targetId || !replyId || !content) {
      ctx.body = {
        isOk: 0,
        data: "缺少必要信息",
      };
      return;
    }

    // 解析 token，获取 payload
    let payload = getJwtPaload(ctx.header["authorization"]);
    if (!payload) {
      ctx.body = {
        isOk: 0,
        data: "登录已过期，请您重新登录",
      };
      return;
    }

    // 2. 添加评论
    let newer = await newComment({
      targetId,
      replyId,
      authorId: payload.usernumber,
      content,
    });

    if (!newer) {
      ctx.body = {
        isOk: 0,
        data: "评论失败",
      };
      return;
    }

    ctx.body = {
      isOk: 1,
      data: newer,
    };
  }
}

module.exports = new ContentController();
