const router = require("koa-router")();
const userController = require("../controller/UserController");

router.prefix("/user");

// 编辑用户信息
router.post("/edit", userController.edit);

// 上传头像
router.post("/uploadPic", userController.uploadPic);

// 关注用户
router.get("/addFollow", userController.addFollow);

module.exports = router;
