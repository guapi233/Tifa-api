const router = require("koa-router")();
const contentController = require("../controller/contentController");
const { getJwtPaload } = require("../utils/index");

router.prefix("/content");

// 前置钩子
router.use("/", async (ctx, next) => {
  // 解析token 获取usernumber
  const { usernumber } = getJwtPaload(ctx.header["authorization"]);
  ctx.usernumber = usernumber;

  await next();
});

// 添加评论
router.post("/addComment", contentController.addComment);

// 添加点赞
router.get("/addLike", contentController.addLike);

// 添加收藏
router.get("/addCollection", contentController.addCollection);

// 保存草稿
router.post("/saveDraft", contentController.saveDraft);

// 草稿是否存在
router.get("/existDraft", contentController.draftIsExist);

// 删除草稿
router.get("/delDraft", contentController.delDraft);

// 获取草稿列表
router.get("/getDraftList", contentController.getDraftList);

// 获取草稿详情
router.get("/getDraftDetail", contentController.getDraftDetail);

// 新增文章
router.post("/addArticle", contentController.addArticle);

// 删除文章
router.get("/delArticle", contentController.delArticle);

// 编辑文章
router.post("/modifyArticle", contentController.modifyArticle);

// 设置文章允许评论的人群
router.get("/setArticleCommentAllow", contentController.setArticleCommentAllow);

// 举报
router.post("/addReport", contentController.addReport);

// 获取举报列表（管理员）
router.get("/getReportList", contentController.getReportList);

// 获取举报详情（管理员）
router.get("/getReportDetail", contentController.getReportDetail);

// 关闭对某个目标的全部举报（管理员）
router.get("/delReport", contentController.delReport);

// 获取未读的点赞列表
router.get("/getUnReadLikeList", contentController.getUnReadLikeList);

// 获取未读的评论列表
router.get("/getUnReadCommentList", contentController.getUnReadCommentList);

// 获取未读的评论列表
router.get("/getUnReadFollowList", contentController.getUnReadFollowList);

// 设置已读
router.get("/setIsRead", contentController.setIsRead);

// 推送系统通知（管理员）
router.post("/addSystemMes", contentController.addSystemMes);

// 获取未读的系统通知
router.get("/getSystemMesList", contentController.getSystemMesList);

// 发送私信
router.post("/addWhisper", contentController.addWhisper);

// 查询私信
router.get("/getWhisperList", contentController.getWhisperList);

// 创建私信房间（窗口）
router.get("/addRoom", contentController.addRoom);

// 查询私信窗口列表
router.get("/getRoomList", contentController.getRoomList);

// 开/关聊天窗口
router.get("/setRoomShow", contentController.setRoomShow);

// 置顶聊天窗口
router.get("/setRoomTop", contentController.setRoomTop);

// 撤回消息
router.get("/withdrawWhisper", contentController.withdrawWhisper);

// 删除消息
router.get("/deleteWhisper", contentController.deleteWhisper);

// 开启免打扰
router.get("/setUndisturb", contentController.setUndisturb);

module.exports = router;
