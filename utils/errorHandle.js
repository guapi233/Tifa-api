/**
 * jwt 无权 统一处理
 * @param {*} ctx
 * @param {*} next
 */
module.exports = (ctx, next) => {
  return next().catch((err) => {
    if (err.status === 401) {
      ctx.status = 401;
      ctx.body = "Protected resource, use Authorization header to get access\n";
    } else {
      throw err;
    }
  });
};
