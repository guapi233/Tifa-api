const router = require("koa-router")();
const publicController = require("../controller/publicController");
const { userIsExist } = require("../model/User");

router.prefix("/public");

router.get("/getCaptcha", publicController.getCaptcha);

router.get("/exist", async (ctx) => {
  let { usernumber } = ctx.query;

  let result = await userIsExist({ usernumber });

  ctx.body = {
    isOk: Number(result),
    data: result,
  };
});

module.exports = router;
