const Koa = require("koa");
const app = new Koa();
const JWT = require("koa-jwt");
const cors = require("koa2-cors");
const json = require("koa-json");
const onerror = require("koa-onerror");
const bodyparser = require("koa-bodyparser");
const logger = require("koa-logger");

const index = require("./routes/index");
const users = require("./routes/users");
const login = require("./routes/login");

// error handler
onerror(app);

// 定义公共路径，不需要 JWT 鉴权
const jwt = JWT({ secret: require("./config/index").JWT_SECRET }).unless({
  path: [/^\/public/, /^\/login/],
});

// 处理 jwt 无权错误
app.use(require("./utils/errorHandle"));

// middlewares
app.use(
  bodyparser({
    enableTypes: ["json", "form", "text"],
  })
);
app.use(json());
app.use(logger());
app.use(cors());
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

// error-handling
app.on("error", (err, ctx) => {
  console.error("server error", err, ctx);
});

module.exports = app;
