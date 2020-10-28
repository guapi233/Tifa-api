const router = require("koa-router")();

const loginController = require("../controller/loginController");

router.prefix("/login");

// 登录
router.post("/", loginController.login);

// 注册
router.post("/reg", loginController.register);

module.exports = router;
