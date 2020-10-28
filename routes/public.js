const router = require("koa-router")();
const publicController = require("../controller/publicController");

router.prefix("/public");

// 获取验证码
router.get("/getCaptcha", publicController.getCaptcha);

// 用户是否存存在
router.get("/exist", publicController.userIsExist);

module.exports = router;
