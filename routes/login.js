const router = require("koa-router")();
const jsonwebtoken = require("jsonwebtoken");
const config = require("../config/index");

router.prefix("/login");

router.get("/", async (ctx) => {
  let token = jsonwebtoken.sign({ _id: "Mob" }, config.JWT_SECRET, {
    expiresIn: "1d",
  });

  ctx.body = {
    status: 200,
    token,
  };
});

module.exports = router;
