const router = require("koa-router")();
const publicController = require("../controller/publicController");

router.prefix("/public");

// 获取验证码
router.get("/getCaptcha", publicController.getCaptcha);

// 用户是否存存在
router.get("/exist", publicController.userIsExist);

// 获取文章列表
router.get("/getArticleList", publicController.getArticleList);

// 获取文章详情
router.get("/getArticleDetail", publicController.getArticleDetail);

// 获取用户公开信息
router.get("/getUserInfo", publicController.getUserInfo);

// 获取文章评论列表
router.get("/getCommentList", publicController.getCommentList);

// 获取文章点赞列表
router.get("/getLikeList", publicController.getLikeList);

// 获取用户收藏列表
router.get("/getCollectionList", publicController.getCollectionList);

module.exports = router;
