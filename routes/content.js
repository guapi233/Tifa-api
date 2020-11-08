const router = require("koa-router")();
const contentController = require("../controller/contentController");

router.prefix("/content");

// 添加评论
router.post("/addComment", contentController.addComment);

// 添加点赞
router.get("/addLike", contentController.addLike);

module.exports = router;
