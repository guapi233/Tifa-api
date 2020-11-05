const router = require("koa-router")();
const contentController = require("../controller/contentController");

router.prefix("/content");

// 添加评论
router.post("/addComment", contentController.addComment);

module.exports = router;
