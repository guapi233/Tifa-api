const router = require("koa-router")();
const userController = require("../controller/UserController");

router.prefix("/user");

// 编辑用户信息
router.post("/edit", userController.edit);

// 上传头像
router.post("/uploadPic", userController.uploadPic);

// 关注用户
router.get("/addFollow", userController.addFollow);

// 设置消息通知
router.post("/setNotice", userController.setNotice);

// 拉黑
router.get("/setBlacklisted", userController.setBlacklisted);

// 获取我拉黑的列表
router.get("/getBlacklistedList", userController.getBlacklistedList);

// 修改偏好
router.post("/setMinePre", userController.setMinePre);

module.exports = router;
