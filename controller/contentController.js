const { newComment, CommentModel } = require("../model/Comment");
const { ArticleModel } = require("../model/Article");
const { getJwtPaload } = require("../utils/index");
const { UserModel } = require("../model/User");

class ContentController {
  // 添加评论信息
  async addComment(ctx) {
    // type 为当前评论的所属， targetType 为当前评论对象的所属，secondLevelCommentId 如果评论对象同位二级评论需要将其Id传过来
    let {
      targetId,
      replyId,
      content,
      type,
      targetType,
      secondLevelCommentId,
    } = ctx.request.body;

    // 1. 校验信息
    if (!targetId || !replyId || !content || typeof type === "undefined") {
      ctx.body = {
        isOk: 0,
        data: "缺少必要信息",
      };
      return;
    }

    // 2. 查询评论对象是否存在：type 0为文章，1为一级评论评论
    let targetModels = [
      [ArticleModel, "articleId"],
      [CommentModel, "commentId"],
    ];
    let model = targetModels[type][0],
      idName = targetModels[type][1],
      filterStr =
        type === 1
          ? `commentId targetId commentCount`
          : `${idName} commentCount`;
    let target = await model.findOne(
      { [idName]: targetId, status: 1 },
      filterStr
    );
    if (!target) {
      ctx.body = {
        isOk: 0,
        data: "评论对象不存在或已删除",
      };
      return;
    }

    // 3.如果评论对象为一级评论，还需将该一级评论的评论对象的评论数量 + 1
    let targetOfTarget = null;
    if (type === 1) {
      if (typeof targetType === "undefined") {
        ctx.body = {
          isOk: 0,
          data: "缺少必要的参数",
        };
        return;
      }

      // 查询一级评论的评论对象
      let model = targetModels[targetType][0],
        idName = targetModels[targetType][1],
        filterStr = `${idName} commentCount`;

      targetOfTarget = await model.findOne(
        { [idName]: target.targetId, status: 1 },
        filterStr
      );

      if (!targetOfTarget) {
        ctx.body = {
          isOk: 0,
          data: "评论的对象不存在或已删除",
        };
        return;
      }

      // 3.1 如果评论的对象为2级评论，需要顺道将该2级评论的 commentCount++;
      if (secondLevelCommentId) {
        let secondComment = await CommentModel.findOne({
          commentId: secondLevelCommentId,
          status: 1,
        });

        // 3.1.1 判断是否为 2级评论
        let isSecondComment = await CommentModel.findOne(
          { commentId: secondComment.targetId, status: 1 },
          "_id"
        );

        if (!isSecondComment) {
          ctx.body = {
            isOk: 0,
            data: "无效的二级评论信息",
          };
          return;
        }

        // 3.1.2 为当前 2级评论的 commentCount++，并保存
        secondComment.commentCount++;
        secondComment.save();
      }
    }

    // 4. 解析 token，获取 payload
    let payload = getJwtPaload(ctx.header["authorization"]);
    if (!payload) {
      ctx.body = {
        isOk: 0,
        data: "登录已过期，请您重新登录",
      };
      return;
    }

    // 5. 添加评论
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

    // 6. 解析 replyId ，添加回复人信息
    newer.reply = await UserModel.findOne(
      { usernumber: newer.replyId },
      "usernumber name pic title"
    );

    // 7. 评论对象的评论数量 +1
    if (type === 1) {
      targetOfTarget.commentCount += 1;
      targetOfTarget.save();
    }

    target.commentCount += 1;
    target.save();

    ctx.body = {
      isOk: 1,
      data: newer,
    };
  }
}

module.exports = new ContentController();
