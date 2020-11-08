const svgCaptcha = require("svg-captcha");
const { setRedisVal } = require("../utils/redis");
const config = require("../config/index");
const { userIsExist, UserModel } = require("../model/User");
const { ArticleModel } = require("../model/Article");
const { CommentModel } = require("../model/Comment");
const { getLikes, isLiked } = require("../model/Like");
const { isCollected, getCollections } = require("../model/Collection");

class PublicController {
  // 获取验证码
  async getCaptcha(ctx) {
    const { sid } = ctx.query;

    if (!sid) {
      ctx.body = {
        isOk: 0,
        data: "create fail：没有收到必须的 sid 值。",
      };

      return;
    }

    // 生成验证码
    const newCaptcha = svgCaptcha.create({
      size: 4,
      ignoreChars: "0oO1ilLI",
      color: true,
      noise: Math.floor(Math.random() * 5),
      width: 150,
      height: 38,
    });

    // 将 sid 与 验证文字 写入 Redis，设置过期时间
    setRedisVal(sid, newCaptcha.text, config.CAPTCHA_LIFE);

    ctx.body = {
      isOk: 1,
      data: newCaptcha.data,
    };
  }

  // 用户是否存在
  async userIsExist(ctx) {
    let { usernumber } = ctx.query;

    let result = await userIsExist({ usernumber });

    ctx.body = {
      isOk: 1,
      data: result,
    };
  }

  // 获取文章列表
  async getArticleList(ctx) {
    let { limit, skip } = ctx.query;

    // 1. 校验数据
    limit = Number(limit) ? Number(limit) : null;
    if (!Number(skip)) {
      skip = 0;
    }

    // 2. 筛选要读取的数据
    const filterList = ["-content"];
    const filterStr = filterList.join(" ");

    // 3. 读取数据
    let result = await ArticleModel.find({ status: 1 }, filterStr)
      .sort({ created: -1 })
      .skip(Number(skip))
      .limit(limit);

    // 4. 查找文章对应的作者信息
    result = await Promise.all(
      result.map(async (article) => {
        article = article.toObject();

        let filterStr = "usernumber pic name summary";
        article.author = await UserModel.findOne(
          { usernumber: article.author },
          filterStr
        );

        return article;
      })
    );

    ctx.body = {
      isOk: 1,
      data: result,
    };
  }

  // 获取文章详情
  async getArticleDetail(ctx) {
    // 1. 校验数据
    const { articleId, usernumber } = ctx.query;

    if (!articleId) {
      ctx.body = {
        isOk: 0,
        data: "缺少必要的文章ID",
      };
      return;
    }

    // 2. 读取数据
    let result = await ArticleModel.findOne({ articleId, status: 1 });

    if (!result) {
      ctx.body = {
        isOk: 0,
        data: "您所访问文章不存在或已删除",
      };
      return;
    }
    result = result.toObject();

    // 3. 查询作者信息
    // 需要查询的用户数据
    let filterStr = "usernumber pic name summary";
    let userInfo = await UserModel.findOne(
      { usernumber: result.author },
      filterStr
    );

    if (!userInfo) {
      ctx.body = {
        isOk: 0,
        data: "您所访问文章不存在或已删除",
      };
      return;
    }
    userInfo = userInfo.toObject();
    result.author = userInfo;

    // 4. 查询当前用户是否对当前文章点过赞
    if (!usernumber) {
      result.isLiked = 0;
    } else {
      let res = await isLiked(result.articleId, usernumber);
      result.isLiked = res ? 1 : 0;
    }

    // 5. 是否收藏当前文章
    if (!usernumber) {
      result.isCollected = 0;
    } else {
      let res = await isCollected(result.articleId, usernumber);
      result.isCollected = res ? 1 : 0;
    }

    ctx.body = {
      isOk: 1,
      data: result,
    };
  }

  // 获取用户公开信息
  async getUserInfo(ctx) {
    const { usernumber } = ctx.query;
    if (!usernumber) {
      ctx.body = {
        isOk: 0,
        data: "缺少必须的用户账号",
      };
      return;
    }

    // 查找 & 过滤用户信息
    const filterList = ["password", "_id"];

    let userInfo = await UserModel.findOne({ usernumber });
    if (!userInfo) {
      ctx.body = {
        isOk: 0,
        data: "用户不存在",
      };
      return;
    }

    userInfo = userInfo.toObject();

    filterList.forEach((key) => {
      delete userInfo[key];
    });

    ctx.body = {
      isOk: 1,
      data: userInfo,
    };
  }

  // 获取文章评论列表
  async getCommentList(ctx) {
    /**
     * 此段逻辑需要多次连接数据库，可通过hash进行代价转移
     */
    let { targetId, skip, limit, sort, usernumber } = ctx.query;

    !sort && (sort = "created");
    skip = Number(skip) || 0;
    limit = Number(limit) || 0;

    // 1. 筛选出属于当前文章的评论
    let result = await CommentModel.find({ targetId, status: 1 })
      .sort({ [sort]: -1 })
      .skip(skip * limit)
      .limit(limit);

    // 2. 找出这些一级评论下的二级评论、以及这些评论的作者信息
    result = await Promise.all(
      result.map(async (comment) => {
        comment = comment.toObject();

        // 2.1 一级评论的作者信息 & 判断登录用户是否对该评论点过赞
        comment.author = await UserModel.findOne(
          {
            usernumber: comment.authorId,
            status: 1,
          },
          "usernumber name pic title"
        );

        if (!usernumber) {
          comment.isLiked = 0;
        } else {
          let liked = await isLiked(comment.commentId, usernumber);
          comment.isLiked = Number(liked);
        }

        // 2.2 二级评论及二级评论的作者信息
        // 2.2.1 一级评论中的二级评论
        comment.children = await CommentModel.find({
          targetId: comment.commentId,
          status: 1,
        }).sort({ created: 1 });

        comment.children = await Promise.all(
          // 2.2.2 二级评论的作者信息
          comment.children.map(async (childComment) => {
            childComment = childComment.toObject();
            childComment.author = await UserModel.findOne(
              {
                usernumber: childComment.authorId,
                status: 1,
              },
              "usernumber name pic title"
            );

            // 2.2.3 二级评论的回复人信息
            childComment.reply = await UserModel.findOne(
              {
                usernumber: childComment.replyId,
                status: 1,
              },
              "usernumber name pic title"
            );

            // 2.2.3 判断当前登录用户是否对二级评论点过赞
            if (!usernumber) {
              childComment.isLiked = 0;
            } else {
              let liked = await isLiked(childComment.commentId, usernumber);
              childComment.isLiked = Number(liked);
            }

            return childComment;
          })
        );

        return comment;
      })
    );

    ctx.body = {
      isOk: 1,
      data: result,
    };
  }

  // 获取文章点赞列表
  async getLikeList(ctx) {
    const { targetId, limit = 3 } = ctx.query;
    if (!targetId) {
      ctx.body = {
        isOk: 0,
        data: "缺少必要的信息",
      };
      return;
    }

    let res = await getLikes(targetId, limit);

    res = await Promise.all(
      res.map(async (likeItem) => {
        likeItem = likeItem.toObject();

        likeItem.author = await UserModel.findOne(
          { usernumber: likeItem.authorId },
          "usernumber name pic"
        );
        return likeItem;
      })
    );

    ctx.body = {
      isOk: 1,
      data: res,
    };
  }

  // 获取收藏列表
  async getCollectionList(ctx) {
    const { usernumber } = ctx.query;
    if (!usernumber) {
      ctx.body = {
        isOk: 0,
        data: "缺少必要的信息",
      };
      return;
    }

    let res = await getCollections(usernumber);

    res = await Promise.all(
      res.map(async (collectionItem) => {
        collectionItem = collectionItem.toObject();

        collectionItem.article = await ArticleModel.findOne(
          { articleId: collectionItem.targetId },
          "articleId title banner"
        );
        return collectionItem;
      })
    );

    ctx.body = {
      isOk: 1,
      data: res,
    };
  }
}

module.exports = new PublicController();
