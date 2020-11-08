const router = require("koa-router")();
const userController = require("../controller/UserController");

router.prefix("/user");

router.post("/edit", userController.edit);

router.post("/uploadPic", userController.uploadPic);

router.get("/addFollow", userController.addFollow);

module.exports = router;
