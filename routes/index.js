const router = require("koa-router")();
const { BASE_URL } = require("../config");

router.get("/", async (ctx, next) => {
  ctx.body = "??";
});

router.post("/uploadImg", async (ctx, next) => {
  console.log(ctx.request.files);

  let { path } = ctx.request.files.file;

  // 解析图片路径
  path = path.split("\\");
  path = `/${path[path.length - 2]}/${path[path.length - 1]}`;

  ctx.body = {
    isOk: 1,
    data: {
      uploaded: true,
      url: BASE_URL + path,
    },
  };
});

module.exports = router;
