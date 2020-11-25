const { newComment, CommentModel } = require("../model/Comment");
const {
  ArticleModel,
  newArticle,
  delArticle,
  modifyArticle,
} = require("../model/Article");
const { LikeModel, newLike, delLike, isLiked } = require("../model/Like");
const { getJwtPaload, isNumber } = require("../utils/index");
const { UserModel } = require("../model/User");
const {
  newCollection,
  isCollected,
  delCollection,
} = require("../model/Collection");
const {
  DraftModel,
  newDraft,
  delDraft,
  updateDraft,
  draftIsExist,
  getDraftList,
  getDraftDetail,
} = require("../model/Draft");
const {
  ReportModel,
  newReport,
  delReport,
  existReport,
  getReportDetail,
} = require("../model/Report");
const {
  emitLike,
  emitComment,
  emitFollow,
  emitSystem,
} = require("../utils/socket");
const { FollowModel } = require("../model/Follow");
const { SystemModel, newSystemMes } = require("../model/System");

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
      secondLevelCommentId = "",
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
          ? `commentId targetId commentCount `
          : `${idName} commentCount `;
    filterStr += type === 0 ? "author " : "authorId ";

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
      targetAuthor: target.author || target.authorId,
      content,
      type,
      replySec: secondLevelCommentId,
    });

    // 推送提醒
    emitComment(replyId);

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

  // 添加点赞记录
  async addLike(ctx) {
    // 1. 获取参数 (type: 点赞目标类型，用于更新目标的点赞数量, 0为文章，1为评论)
    const { targetId, type } = ctx.query;
    const { usernumber } = getJwtPaload(ctx.header["authorization"]);
    if (!targetId || !usernumber || typeof type === "undefined") {
      ctx.body = {
        isOk: 0,
        data: "缺少必要信息",
      };
      return;
    }

    let models = [
      [ArticleModel, "articleId"],
      [CommentModel, "commentId"],
    ];
    let model = models[type][0],
      idName = models[type][1];

    // 2. 判断 用户是否点赞
    let res = await isLiked(targetId, usernumber);

    // 3. 如果已经点过赞，则删除点赞记录，否则添加一条点赞信息
    if (res) {
      res = await delLike(targetId, usernumber);

      // 点赞目标 likeCount--
      await model.updateOne(
        { [idName]: targetId },
        {
          $inc: {
            likeCount: -1,
          },
        }
      );
    } else {
      // 读取 targetAuthor
      let targetObj = await model.findOne({ [idName]: targetId });

      if (targetObj) {
        res = await newLike({
          targetId,
          authorId: usernumber,
          targetAuthor: targetObj.author || targetObj.authorId,
          type,
        });
        targetObj.likeCount++;
        await targetObj.save();
      } else {
        res = false;
      }

      // // 点赞目标 likeCount++
      // await model.updateOne(
      //   { [idName]: targetId },
      //   {
      //     $inc: {
      //       likeCount: 1,
      //     },
      //   }
      // );

      // 发起提醒
      emitLike(res.targetAuthor);
    }

    // 4. 按照 操作3 返回对应的格式
    let data = null,
      isOk = 1;
    if (typeof res === "boolean") {
      data = res ? "取消点赞成功" : "取消点赞失败";
      isOk = res ? 1 : 0;
    } else {
      data = res;
    }

    ctx.body = {
      isOk,
      data,
    };
  }

  // 添加收藏记录
  async addCollection(ctx) {
    // 1. 获取参数 & 校验信息
    const { targetId } = ctx.query;
    const { usernumber } = getJwtPaload(ctx.header["authorization"]);
    if (!targetId || !usernumber) {
      ctx.body = {
        isOk: 0,
        data: "缺少必要的信息",
      };
      return;
    }

    // 2. 判断是否已经收藏
    const collected = await isCollected(targetId, usernumber);
    if (collected) {
      await delCollection(targetId, usernumber);
      ctx.body = {
        isOk: 1,
        data: "取消收藏",
      };
      return;
    }

    // 3. 新建收藏记录
    const newer = await newCollection({
      targetId,
      authorId: usernumber,
    });
    if (!newer) {
      ctx.body = {
        isOk: 0,
        data: "收藏失败",
      };
      return;
    }

    ctx.body = {
      isOk: 1,
      data: newer,
    };
  }

  // 修改草稿
  async saveDraft(ctx) {
    // 1. 校验数据
    let { draftId, title, content, banner, words } = ctx.request.body;
    let authorId = ctx.usernumber;
    title = title || "";
    banner = banner || "";
    if (!draftId || !authorId) {
      ctx.body = {
        isOk: 0,
        data: "缺少必要信息",
      };
      return;
    }
    // 过滤 无效保存
    if (!title && !banner && !content && !words) {
      ctx.body = {
        isOk: 1,
        data: "草稿已保存",
      };
      return;
    }

    // 2. 根据草稿是否存在 插入数据 | 修改数据
    const exist = await draftIsExist(draftId, ctx.usernumber);
    let res = null;

    if (exist) {
      // 更新
      res = updateDraft(
        {
          draftId,
          title,
          authorId,
          content,
          banner,
          words,
        },
        ctx.usernumber
      );
    } else {
      // 新建
      res = await newDraft(
        {
          draftId,
          title,
          authorId,
          banner,
          content: content || "",
          words: words || 0,
        },
        ctx.usernumber
      );
    }

    if (!res) {
      ctx.body = {
        isOk: 0,
        data: "草稿保存失败",
      };
      return;
    }

    ctx.body = {
      isOk: 1,
      data: "草稿已保存",
    };
  }

  // 草稿是否存在
  async draftIsExist(ctx) {
    const { draftId } = ctx.query;

    let res = await draftIsExist(draftId, ctx.usernumber);

    ctx.body = {
      isOk: 1,
      data: res,
    };
  }

  // 删除草稿
  async delDraft(ctx) {
    const { draftId } = ctx.query;

    if (!draftId) {
      ctx.body = {
        isOk: 0,
        data: "缺少必要信息",
      };
      return;
    }

    let res = await delDraft(draftId, ctx.usernumber);

    if (!res) {
      ctx.body = {
        isOk: 0,
        data: "删除失败",
      };
      return;
    }

    ctx.body = {
      isOk: 1,
      data: "成功删除该草稿",
    };
  }

  // 查询草稿列表
  async getDraftList(ctx) {
    const authorId = ctx.usernumber;

    let res = await getDraftList(authorId);

    ctx.body = {
      isOk: 1,
      data: res,
    };
  }

  // 查询草稿详情
  async getDraftDetail(ctx) {
    const { draftId } = ctx.query;

    // 1. 去文章集合中查找，看是不是用于编辑原文章的草稿
    let isEdit = await ArticleModel.findOne({ articleId: draftId }, "_id");

    // 2. 查找草稿详细信息
    let res = await getDraftDetail(draftId, ctx.usernumber);

    // 3. 挂载相关信息
    res.isEdit = Boolean(isEdit);

    ctx.body = {
      isOk: 1,
      data: res,
    };
  }

  // 新增文章
  async addArticle(ctx) {
    // 1. 校验信息
    const { title, banner, tags, content, draftId } = ctx.request.body;

    if (!title || !content) {
      ctx.body = {
        isOk: 0,
        data: "缺少必要信息",
      };
      return;
    }

    // 2. 新建文章
    let res = await newArticle({
      title,
      banner,
      tags,
      content,
      author: ctx.usernumber,
    });

    if (!res) {
      ctx.body = {
        isOk: 0,
        data: "文章发布失败",
      };
      return;
    }

    // 3. 获取用户信息
    res.author = await UserModel.findOne({ usernumber: ctx.usernumber });

    // 4. 移除草稿
    if (draftId) {
      await delDraft(draftId, ctx.usernumber);
    }

    ctx.body = {
      isOk: 1,
      data: res,
    };
  }

  // 删除文章
  async delArticle(ctx) {
    const { articleId } = ctx.query;
    const author = ctx.usernumber;

    let res = await delArticle(articleId, author);

    if (!res) {
      ctx.body = {
        isOk: 0,
        data: "删除失败",
      };
      return;
    }

    ctx.body = {
      isOk: 1,
      data: "删除成功",
    };
  }

  // 修改文章
  async modifyArticle(ctx) {
    // 1. 校验信息
    const { title, banner, tags, content, draftId } = ctx.request.body;

    if (!title || !content) {
      ctx.body = {
        isOk: 0,
        data: "缺少必要信息",
      };
      return;
    }

    // 2. 更新数据
    const res = await modifyArticle(
      {
        articleId: draftId,
        title,
        banner,
        tags,
        content,
      },
      ctx.usernumber
    );

    // 3. 移除草稿
    if (draftId) {
      await delDraft(draftId, ctx.usernumber);
    }

    ctx.body = {
      isOk: 1,
      data: "更新成功",
    };
  }

  // 举报
  async addReport(ctx) {
    let { type, category, targetId, content = "" } = ctx.request.body;
    const authorId = ctx.usernumber;
    type = Number(type);
    category = Number(category);

    // 1. 校验信息
    if (!isNumber(type) || !isNumber(category) || !targetId) {
      return (ctx.body = {
        isOk: 0,
        data: "缺少必要信息",
      });
    }

    // 2. 判断是否重复举报
    let existed = await existReport(targetId, authorId);
    if (existed) {
      return (ctx.body = {
        isOk: 1,
        data: "您已对该违规行为进行过举报，请耐心等待管理员处理",
      });
    }

    // 3. 添加举报信息
    await newReport({
      type,
      category,
      targetId,
      content,
      authorId,
    });

    ctx.body = {
      isOk: 1,
      data: "举报成功，管理员会迅速做出处理",
    };
  }

  // 获取举报列表（管理员）
  async getReportList(ctx) {
    let { limit, skip, targetId, type, category } = ctx.query;
    limit = Number(limit) || 20;
    skip = Number(skip) || 0;

    // 1. 组件筛选条件对象
    const filterObj = { status: 1 };
    targetId && (filterObj["targetId"] = targetId);
    type && (filterObj["type"] = type);
    category && (filterObj["type"] = category);

    // 2. 获取举报列表
    let res = await ReportModel.find(filterObj, "-content -_id");

    ctx.body = {
      isOk: 1,
      data: res,
    };
  }

  // 获取举报详情（管理员）
  async getReportDetail(ctx) {
    const { reportId } = ctx.query;
    const oper = ctx.usernumber;

    let res = await getReportDetail(reportId, oper);
    if (!res) {
      return (ctx.body = {
        isOk: 0,
        data: "查询失败",
      });
    }

    ctx.body = {
      isOk: 1,
      data: res,
    };
  }

  // 关闭目标的举报信息（管理员）
  async delReport(ctx) {
    const { targetId } = ctx.query;
    const oper = ctx.usernumber;

    let res = await delReport(targetId, oper);
    if (!res) {
      return (ctx.body = {
        isOk: 0,
        data: "操作失败",
      });
    }

    ctx.body = {
      isOk: 1,
      data: "操作成功",
    };
  }

  // 获取未读的点赞列表
  async getUnReadLikeList(ctx) {
    let { skip, limit } = ctx.query;
    skip = Number(skip) || 0;
    limit = Number(limit) || 20;
    const targetAuthor = ctx.usernumber;

    const res = await LikeModel.find({ targetAuthor, isRead: 0 })
      .limit(limit)
      .skip(skip * limit)
      .sort({ created: -1 });

    // 查询拓展信息
    for (let i = 0; i < res.length; i++) {
      // // 将 isRead 设置为 1（已读）
      // res[i].isRead = 1;
      // await res[i].save();

      let temp = (res[i] = res[i].toObject()),
        content = "";

      // 查询点赞的内容（文章展示标题）
      if (temp.type === 0) {
        content = await ArticleModel.findOne(
          { articleId: temp.targetId },
          "-_id title"
        );
      } else if (temp.type === 1) {
        content = await CommentModel.findOne(
          { commentId: temp.targetId },
          "-_id content"
        );
      }

      // 查询作者信息
      let authorObj = await UserModel.findOne(
        { usernumber: temp.authorId },
        "usernumber name pic title"
      );

      temp.content = content.title || content.content;
      temp.authorObj = authorObj;
    }

    // // 清除当前 点赞 的提醒数量
    // emitLike(targetAuthor);

    ctx.body = {
      isOk: 1,
      data: res,
    };
  }

  // 获取未读的评论列表
  async getUnReadCommentList(ctx) {
    let { skip, limit } = ctx.query;
    skip = Number(skip) || 0;
    limit = Number(limit) || 20;
    const targetAuthor = ctx.usernumber;

    const res = await CommentModel.find({ replyId: targetAuthor, isRead: 0 })
      .limit(limit)
      .skip(skip * limit)
      .sort({ created: -1 });

    // 查询拓展信息
    for (let i = 0; i < res.length; i++) {
      // // 将 isRead 设置为 1（已读）
      // res[i].isRead = 1;
      // await res[i].save();

      let temp = (res[i] = res[i].toObject()),
        content = {};

      // 查询评论的内容（文章展示标题）
      // 如果当前评论对象是评论（1），那需要找出一级评论的评论对象
      if (temp.type === 0) {
        content = await ArticleModel.findOne(
          { articleId: temp.targetId },
          "-_id title"
        );
      } else if (temp.type === 1) {
        // 查找评论对象的内容
        const commentId = temp.replySec || temp.targetId;

        content = await CommentModel.findOne({ commentId }, "-_id content");

        // 查找评论所属的类型和id
        let res = await CommentModel.findOne(
          { commentId: temp.targetId },
          "-_id commentId type"
        );

        res = res || {};

        content.commentId = res.commentId;
        content.type = res.type;
      }

      // 查询作者信息
      let authorObj = await UserModel.findOne(
        { usernumber: temp.authorId },
        "usernumber name pic title"
      );

      // 查询是否对当前评论点过赞
      let liked = await isLiked(temp.commentId, targetAuthor);

      temp.reply = temp.content;
      temp.content = content.title || content.content;
      temp.authorObj = authorObj;
      temp.isLiked = Number(liked);
      // 如果评论目标（一级评论）的type为文章，则将 belong 属性设为文章Id
      content.commentId && (temp.belong = content.commentId);
      isNumber(content.type) && (temp.belongType = content.type);
    }

    // // 清除当前 点赞 的提醒数量
    // emitLike(targetAuthor);

    ctx.body = {
      isOk: 1,
      data: res,
    };
  }

  // 获取未读的关注列表
  async getUnReadFollowList(ctx) {
    let { skip, limit } = ctx.query;
    skip = Number(skip) || 0;
    limit = Number(limit) || 20;
    const targetId = ctx.usernumber;

    const res = await FollowModel.find({ targetId, isRead: 0 })
      .limit(limit)
      .skip(skip * limit)
      .sort({ created: -1 });

    // 查询拓展信息
    for (let i = 0; i < res.length; i++) {
      let temp = (res[i] = res[i].toObject());

      // 查询作者信息
      let authorObj = await UserModel.findOne(
        { usernumber: temp.authorId },
        "usernumber name pic title"
      );

      temp.authorObj = authorObj;
    }

    ctx.body = {
      isOk: 1,
      data: res,
    };
  }

  // 设置已读
  async setIsRead(ctx) {
    const { type, id, unRead = false } = ctx.query;
    const uid = ctx.usernumber;

    // 3为系统通知
    if (type == 3) {
      // 查询用户原本阅读的 系统通知 数量，用于计算应该减去多少通知
      let oldCount = await UserModel.findOne(
        { usernumber: uid },
        "systemCount"
      );
      try {
        oldCount = oldCount.systemCount || 0;
      } catch (err) {
        oldCount = 0;
      }

      let res = await UserModel.updateOne(
        { usernumber: uid },
        { systemCount: id }
      );

      // 更新通知
      res.n && emitSystem(uid, oldCount - id);

      return (ctx.body = {
        isOk: res.n,
        data: res.n ? "成功设置已读" : "设置失败",
      });
    }

    // 0为点赞、1为评论、2为关注
    const Models = [LikeModel, CommentModel, FollowModel],
      idNames = ["likeId", "commentId", "followId"],
      emitFns = [emitLike, emitComment, emitFollow],
      targetIds = ["targetAuthor", "replyId", "targetId"];

    // 组件更新条件对象
    const selectObj = {};
    type && (selectObj[targetIds[type]] = uid);
    id && (selectObj[idNames[type]] = id);
    const updateObj = { isRead: 1 };
    unRead && (updateObj.isRead = 0);

    await Models[type].updateMany(selectObj, updateObj);

    // 更新提醒
    emitFns[type](uid, -1);

    ctx.body = {
      isOk: 1,
      data: unRead ? "取消已读" : "成功设置已读",
    };
  }

  // 推送系统通知（管理员）
  async addSystemMes(ctx) {
    const { targetId, title, content } = ctx.request.body;
    if (!title || !content) {
      return (ctx.body = {
        isOk: 0,
        data: "缺少必要的参数",
      });
    }

    // 新建通知
    let newer = await newSystemMes({
      title,
      content,
    });
    if (!newer) {
      return (ctx.body = {
        isOk: 0,
        data: "推送失败",
      });
    }

    // 全体推送消息
    emitSystem();

    ctx.body = {
      isOk: 1,
      data: newer,
    };
  }

  // 获取全部的系统通知
  async getSystemMesList(ctx) {
    let { skip, limit } = ctx.query;
    skip = Number(skip) || 0;
    limit = Number(limit) || 20;
    const usernumber = ctx.usernumber;

    // 读取用户最新阅读的通知
    let readerNumber = await UserModel.findOne(
      { usernumber },
      "-_id systemCount"
    );

    try {
      readerNumber = readerNumber.systemCount || 0;
    } catch (err) {
      console.log(err);
      readerNumber = 0;
    }

    // 读取指定的通知
    let systems = await SystemModel.find()
      .skip(skip * limit)
      .limit(limit)
      .sort({ created: -1 });

    // 根据用户阅读的数量，来判断对于该用户的 新通知
    systems = systems.map((system) => {
      system = system.toObject();
      if (system.systemId > readerNumber) {
        system.isNew = 1;
      }

      return system;
    });

    ctx.body = {
      isOk: 1,
      data: systems,
    };
  }
}

module.exports = new ContentController();
