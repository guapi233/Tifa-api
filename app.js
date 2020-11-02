const Koa = require("koa");
const app = new Koa();
const JWT = require("koa-jwt");
const cors = require("koa2-cors");
const json = require("koa-json");
const onerror = require("koa-onerror");
// const bodyparser = require("koa-bodyparser");
const body = require("koa-body");
const logger = require("koa-logger");
const path = require("path");

const index = require("./routes/index");
const users = require("./routes/users");
const login = require("./routes/login");
const public = require("./routes/public");

// error handler
onerror(app);

// 定义公共路径，不需要 JWT 鉴权
const jwt = JWT({ secret: require("./config/index").JWT_SECRET }).unless({
  path: [/^\/public/, /^\/login/],
});

// 处理 jwt 无权错误
app.use(require("./utils/errorHandle"));

// middlewares
app.use(cors());
app.use(
  body({
    multipart: true, // 支持文件上传
    // encoding: "gzip",
    formidable: {
      uploadDir: path.join(__dirname, "public/img/"), // 设置文件上传目录
      keepExtensions: true, // 保持文件的后缀
      maxFieldsSize: 5 * 1024 * 1024, // 文件上传大小
      onFileBegin: (name, file) => {
        // 文件上传前的设置
        // console.log(`name: ${name}`);
        // console.log(file);
      },
    },
  })
);
app.use(json());
app.use(logger());
app.use(require("koa-static")(__dirname + "/public"));
app.use(jwt);

// logger
app.use(async (ctx, next) => {
  const start = new Date();
  await next();
  const ms = new Date() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
});

// routes
app.use(index.routes(), index.allowedMethods());
app.use(users.routes(), users.allowedMethods());
app.use(login.routes(), login.allowedMethods());
app.use(public.routes(), public.allowedMethods());

// error-handling
app.on("error", (err, ctx) => {
  console.error("server error", err, ctx);
});

module.exports = app;
