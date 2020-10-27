const router = require("koa-router")();
const publicController = require("../controller/publicController");

router.prefix("/public");

router.get("/getCaptcha", publicController.getCaptcha);

module.exports = router;
