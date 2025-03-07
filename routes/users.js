const router = require("koa-router")();
const userController = require("../controller/UserController");
const { getJwtPaload } = require("../utils/index");

router.prefix("/user");

// 前置钩子
router.use("/", async (ctx, next) => {
  // 解析token 获取usernumber
  if (ctx.header["authorization"]) {
    const { usernumber } = getJwtPaload(ctx.header["authorization"]);
    ctx.usernumber = usernumber;
  }

  await next();
});

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

// 绑定邮箱
router.get("/setEmail", userController.setEmail);

// 修改密码
router.get("/setPassword", userController.setPassword);

// 设置个性域名
router.get("/setAlias", userController.setAlias);

module.exports = router;
