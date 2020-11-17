const { newComment, CommentModel } = require("../model/Comment");
const {
  ArticleModel,
  newArticle,
  delArticle,
  modifyArticle,
} = require("../model/Article");
const { newLike, delLike, isLiked } = require("../model/Like");
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
const { get } = require("mongoose");

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
      res = await newLike({
        targetId,
        authorId: usernumber,
      });

      // 点赞目标 likeCount++
      await model.updateOne(
        { [idName]: targetId },
        {
          $inc: {
            likeCount: 1,
          },
        }
      );
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
}

module.exports = new ContentController();
