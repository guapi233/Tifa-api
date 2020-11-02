const router = require("koa-router")();
const UserController = require("../controller/UserController");

router.prefix("/user");

router.post("/edit", UserController.edit);

module.exports = router;
