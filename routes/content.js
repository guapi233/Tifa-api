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

// 删除草稿
router.get("/delDraft", contentController.delDraft);

// 获取草稿列表
router.get("/getDraftList", contentController.getDraftList);

// 获取草稿详情
router.get("/getDraftDetail", contentController.getDraftDetail);

// 新增文章
router.post("/addArticle", contentController.addArticle);

module.exports = router;
