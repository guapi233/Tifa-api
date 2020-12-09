const svgCaptcha = require("svg-captcha");
const { setRedisVal } = require("../utils/redis");
const {
  shuffle,
  getJwtPaload,
  getUuid,
  isEmail,
  fail,
  suc,
} = require("../utils/index");
const config = require("../config/index");
const { userIsExist, UserModel } = require("../model/User");
const { ArticleModel } = require("../model/Article");
const { CommentModel } = require("../model/Comment");
const { LikeModel, getLikes, isLiked } = require("../model/Like");
const {
  getFollowList,
  getFollowedList,
  isFollowed,
  FollowModel,
} = require("../model/Follow");
const { isBlackListed, getBlacklistedList } = require("../model/BlackListed");
const { isCollected, getCollections } = require("../model/Collection");
const { getTrendList } = require("../model/Trend");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { sendMailAsVerifyCode, sendMailAsLink } = require("../utils/mailer");
const { CAPTCHA_LIFE, BASE_URL } = require("../config");

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
    let { limit, skip, usernumber, self } = ctx.query;

    // 1. 校验数据
    limit = Number(limit) ? Number(limit) : null;
    skip = Number(skip) ? Number(skip) : 0;

    // 2. 筛选要读取的数据
    const filterList = ["-content"];
    const filterStr = filterList.join(" ");

    // 3. 读取数据
    let result = [];
    if (usernumber) {
      // 用户页文章
      result = await ArticleModel.find({ status: 1, author: usernumber }).sort({
        created: -1,
      });
    } else {
      // 首页文章
      // 过滤我屏蔽人的文章
      let blacklistedList = [];
      if (self) {
        blacklistedList = await getBlacklistedList(self);
      }
      result = await ArticleModel.find(
        { status: 1, author: { $nin: blacklistedList } },
        filterStr
      )
        .sort({ created: -1 })
        .skip(skip * limit)
        .limit(limit);
    }

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
    // 阅读量 ++
    result.viewCount++;
    result.save();

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

    // 4. 是否关注该用户 & 是否被作者关注 & 是否点过赞
    if (!usernumber) {
      result.author.isFollowed = 0;
      result.author.hasFollowed = 0;
      result.isLiked = 0;
    } else {
      const followed = await isFollowed(result.author.usernumber, usernumber);
      result.author.isFollowed = Number(followed);

      const hasFollowed = await isFollowed(
        usernumber,
        result.author.usernumber
      );
      result.author.hasFollowed = Number(hasFollowed);

      const liked = await isLiked(result.articleId, usernumber);
      result.isLiked = Number(liked);
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
    // 1. 校验信息
    const { usernumber, self } = ctx.query;
    if (!usernumber) {
      ctx.body = {
        isOk: 0,
        data: "缺少必须的用户账号",
      };
      return;
    }

    // 2. 查找 & 过滤用户信息
    const filterList = ["password", "_id"];

    let userInfo = await UserModel.findOne({
      $where: `this.alias === "${usernumber}" || this.usernumber === "${usernumber}"`,
    });
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

    // 3. 查询 是否关注此用户 & 第一人称用户有没有屏蔽该用户
    if (usernumber !== self) {
      const followed = await isFollowed(usernumber, self);
      userInfo.isFollowed = followed ? 1 : 0;

      const blacklisted = await isBlackListed(usernumber, self, false);
      userInfo.blacklisted = Boolean(blacklisted);
    }

    // 4. 添加汇总信息（加入天数、创建文章数量、文章阅读总数量、收到的点赞量）
    // 4.1 加入时间
    const difference = Date.now() - userInfo.created.getTime();
    userInfo.joined = Math.floor(difference / (1000 * 60 * 60 * 24));
    // 4.2 文章数量
    const articles = await ArticleModel.find({
      author: userInfo.usernumber,
      status: 1,
    });
    userInfo.articleCount = articles.length;
    // 4.3 获赞数量（文章总获赞数 + 评论总获赞数） & 文章阅读量
    let likeCount = 0,
      viewCount = 0;
    const comments = await CommentModel.find({
      authorId: userInfo.usernumber,
      status: 1,
    });
    articles.forEach((article) => {
      likeCount += article.likeCount;
      viewCount += article.viewCount;
    });
    comments.forEach((comment) => {
      likeCount += comment.likeCount;
    });

    userInfo.likeCount = likeCount;
    userInfo.viewCount = viewCount;

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
    const { usernumber: self } = getJwtPaload(ctx.header["authorization"]);
    if (!usernumber) {
      ctx.body = {
        isOk: 0,
        data: "缺少必要的信息",
      };
      return;
    }

    // 该用户是否展示自己的收藏列表
    const user = await UserModel.findOne({ usernumber }, "collectionVisible");
    if (user && !user.collectionVisible && usernumber !== self) {
      return (ctx.body = {
        isOk: 1,
        data: [],
      });
    }

    let res = await getCollections(usernumber);

    res = await Promise.all(
      res.map(async (collectionItem) => {
        collectionItem = collectionItem.toObject();

        collectionItem.article = await ArticleModel.findOne(
          { articleId: collectionItem.targetId },
          "articleId title banner created author likeCount commentCount status"
        );
        collectionItem.article = collectionItem.article.toObject();

        // 判断该文章是否被删除
        if (!collectionItem.article.status) {
          collectionItem.article.title += "（已删除）";
        }

        // 用户信息
        collectionItem.article.author = await UserModel.findOne(
          { usernumber: collectionItem.article.author },
          "usernumber name pic"
        );
        return collectionItem;
      })
    );

    ctx.body = {
      isOk: 1,
      data: res,
    };
  }

  // 获取用户关注的列表
  async getFollowList(ctx) {
    let { authorId, usernumber, limit, skip } = ctx.query;

    limit = Number(limit) || 9;
    skip = Number(skip) || 0;

    let res = await getFollowList(authorId, limit, skip);

    // 返回目标用户信息
    for (let i = 0; i < res.length; i++) {
      res[i] = res[i].toObject();
      let item = res[i];

      item.author = await UserModel.findOne(
        { usernumber: item.targetId },
        "usernumber name pic title summary follow followed"
      );
      // 查询用户发布的文章数量
      if (item.author) {
        item.author = item.author.toObject();
        item.author.articleCount = await ArticleModel.find({
          author: item.author.usernumber,
        }).countDocuments();

        // 判断当前查看这些信息的用户是否关注这些用户
        if (usernumber) {
          let followed = await isFollowed(item.targetId, usernumber);
          item.author.isFollowed = Number(followed);
        }
      }
    }

    ctx.body = {
      isOk: 1,
      data: res,
    };
  }

  // 获取关注用户的列表
  async getFollowedList(ctx) {
    let { targetId, usernumber, limit, skip } = ctx.query;

    limit = Number(limit) || 9;
    skip = Number(skip) || 0;

    let res = await getFollowedList(targetId, limit, skip);

    // 返回目标用户信息
    for (let i = 0; i < res.length; i++) {
      res[i] = res[i].toObject();
      let item = res[i];

      item.author = await UserModel.findOne(
        { usernumber: item.authorId },
        "usernumber name pic title summary follow followed"
      );
      // 查询用户发布的文章数量
      if (item.author) {
        item.author = item.author.toObject();
        item.author.articleCount = await ArticleModel.find({
          author: item.author.usernumber,
        }).countDocuments();
      }
    }

    // 判断当前查看这些信息的用户是否关注这些用户
    if (usernumber) {
      for (let i = 0; i < res.length; i++) {
        let item = res[i];

        let followed = await isFollowed(item.authorId, usernumber);
        item.isFollowed = Number(followed);
      }
    }

    ctx.body = {
      isOk: 1,
      data: res,
    };
  }

  // 获取当前文章衍生的推荐阅读文章
  async getRecArticle(ctx) {
    let { articleId, tags, limit } = ctx.query;
    // 尝试从token中拿当前登录状态
    let payload = null;
    ctx.header["authorization"] &&
      (payload = getJwtPaload(ctx.header["authorization"]));

    tags = tags.split("|");
    limit = Number(limit) || 6;

    let articles = [],
      idList = [articleId];

    // 0. 过滤我屏蔽人的文章
    let blacklistedList = [];
    if (payload && payload.usernumber) {
      blacklistedList = await getBlacklistedList(payload.usernumber);
    }

    // 1. 查询数据
    for (let i = 0; i < tags.length; i++) {
      let res = await ArticleModel.find({
        tags: { $in: tags[i] },
        articleId: { $nin: idList },
        author: { $nin: blacklistedList },
        status: 1,
      }).limit(limit);

      articles.push(...res);
      res.forEach((item) => {
        idList.push(item.articleId);
      });
    }

    // 2. 打乱数据 & 获取指定数量
    articles = shuffle(articles);
    articles = articles.splice(0, limit);

    // 3. 查询文章作者信息
    for (let i = 0; i < articles.length; i++) {
      let res = await UserModel.findOne(
        { usernumber: articles[i].author },
        "usernumber name pic"
      );

      articles[i] = articles[i].toObject();
      articles[i].author = res;
    }

    ctx.body = {
      isOk: 1,
      data: articles,
    };
  }

  // 拉取B站EMOJI
  async getBiEmoji(ctx) {
    const { emojiList } = ctx.request.body;
    let saveCount = 0,
      existCount = 0,
      saveArr = [];

    const data = await new Promise(async (resolve, reject) => {
      // 遍历emoji列表
      for (let i = 0; i < emojiList.length; i++) {
        const emojiItem = emojiList[i];

        // 1. 请求EMOJI图片
        let res = await axios({
          method: "GET",
          url: emojiItem,
          responseType: "stream",
        });

        // 2. 解析存储路径
        const imgName = emojiItem.split("/").pop();
        const savePath = path.resolve(__dirname, `../public/img/${imgName}`);

        // 3. 判断文件是否已经存在
        if (fs.existsSync(savePath)) {
          existCount++;
          saveArr.push(imgName);

          if (saveArr.length === emojiList.length) {
            resolve({
              count: emojiList.length,
              saveCount,
              existCount,
            });
          }
          continue;
        }

        // 4. 开启写入流
        const writeStream = fs.createWriteStream(savePath);

        // 5. 写入流关闭时记录存储数据
        writeStream.once("close", () => {
          saveCount++;
          saveArr.push(imgName);

          // 6. 如果已经全部写入完毕，返回数据
          if (saveArr.length === emojiList.length) {
            resolve({
              count: emojiList.length,
              saveCount,
              existCount,
            });
          }
        });

        // 7. 写入数据
        res.data.pipe(writeStream);
      }
    });

    ctx.body = {
      isOk: 1,
      data,
    };
  }

  // 发送邮件
  async sendMail(ctx) {
    // 0位绑定邮箱、1为忘记密码
    let { type, sid, email, usernumber } = ctx.query;
    usernumber =
      usernumber || getJwtPaload(ctx.header["authorization"]).usernumber;

    // 0. 验证邮箱格式
    if (email && !isEmail(email)) {
      return (ctx.body = {
        isOk: 0,
        data: "邮箱格式错误",
      });
    }

    // 1. 查找用户信息
    const user = await UserModel.findOne({ usernumber });
    if (!user || (!user.email && !email)) {
      return (ctx.body = {
        isOk: 0,
        data: "该用户不存在或者未绑定邮箱",
      });
    }

    try {
      // 生成并写入验证码
      const verifyCode = Array.prototype.slice.call(getUuid(), 0, 7).join("");
      setRedisVal(sid, verifyCode, CAPTCHA_LIFE);
      // CAPTCHA_LIFE以秒为单位，转换为分钟
      const validTime = CAPTCHA_LIFE / 60;

      if (type === "0") {
        sendMailAsLink({
          email: email,
          title: "绑定邮箱",
          name: user.name,
          content: `${BASE_URL}/user/setEmail?verifyCode=${verifyCode}&sid=${sid}&email=${email}&usernumber=${usernumber}`,
          validTime,
        });
      } else if (type === "1") {
        sendMailAsVerifyCode({
          email: user.email,
          title: "找回登录密码",
          name: user.name,
          content: verifyCode,
          validTime,
        });
      }
    } catch (err) {
      console.log(err);
      ctx.body = {
        isOk: 0,
        data: "邮件发送失败",
      };
    }

    ctx.body = {
      isOk: 1,
      data: "邮件已发送",
    };
  }

  // 用户动态（传authorId表示单个用户的动态，直接从token拿代表获取关注的人动态）
  async getTrendList(ctx) {
    const { authorId } = ctx.query;
    const { usernumber: self } = getJwtPaload(ctx.header["authorization"]);
    if (!authorId && !self) return fail(ctx, "加载动态失败");
    // 目标用户
    if (authorId) {
      // 处理单目标用户的动态
      const res = await handleTrendList(authorId, 0, 20, self);

      ctx.body = {
        isOk: 1,
        data: res,
      };
    }
  }
}

module.exports = new PublicController();

const trendTypeList = [
  [ArticleModel, "articleId", "author", "-content"],
  [LikeModel, "likeId", "authorId", ""],
  [CommentModel, "commentId", "authorId", ""],
  [FollowModel, "followId", "authorId", ""],
];
async function handleTrendList(authorId, skip = 0, limit = 20, self) {
  const trendList = await getTrendList(authorId, skip, limit);

  for (let i = 0; i < trendList.length; i++) {
    const trend = (trendList[i] = trendList[i].toObject());
    const type = trend.type;
    const oper = trendTypeList[type];

    // 放弃使用聚合管道，改用更强大的populate
    // trend.data = await oper[0].aggregate([{ $match: { [oper[1]]: trend.detailId } }, { $lookup: {
    //   from: "users",
    //   localField: oper[2],
    //   foreignField: "usernumber",
    //   as: "author"
    // } }]);

    //   trend.data = await oper[0]
    //     .findOne({ [oper[1]]: trend.detailId })
    //     .populate({
    //       path: "userInfo",
    //       select: "name pic usernumber",
    //       match: { [oper[2]]:  } // 如何获取findOne查出来的数据？
    //     });
    // }

    // 动态详情
    trend.data = await oper[0].findOne({ [oper[1]]: trend.detailId }, oper[3]);

    trend.data = trend.data.toObject();

    // 如果是评论或点赞，需要查找操作的目标内容
    if ([1, 2].includes(type)) {
      const targets = [
          [ArticleModel, "articleId"],
          [CommentModel, "commentId"],
        ],
        Model = targets[trend.data.type];

      trend.data.oper = await Model[0].findOne(
        { [Model[1]]: trend.data.targetId },
        "-content"
      );
    }

    // 发动态人的信息
    trend.data.authorInfo = await UserModel.findOne(
      { usernumber: trend.data[oper[2]] },
      "usernumber name pic"
    );

    // 动态涉及到的目标用户信息
    const targetId = trend.data.targetAuthor || trend.data.targetId;
    if (targetId) {
      trend.data.targetInfo = await UserModel.findOne(
        { usernumber: targetId },
        "usernumber name pic followed follow"
      );
      trend.data.targetInfo = trend.data.targetInfo.toObject();
      trend.data.targetInfo.articleCount = await ArticleModel.find({
        author: targetId,
        status: 1,
      }).countDocuments();

      // 是否关注了该用户
      if (self) {
        trend.data.targetInfo.isFollowed = await isFollowed(targetId, self);
      }
    }
  }
  return trendList;
}
