const redis = require("redis");
const { promisifyAll } = require("bluebird");
const config = require("../config/index");

const options = {
  host: config.REDIS.host,
  port: config.REDIS.port,
  detect_buffers: true,
  retry_strategy: function (options) {
    if (options.error && options.error.code === "ECONNREFUSED") {
      // End reconnecting on a specific error and flush all commands with
      // a individual error
      return new Error("The server refused the connection");
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      // End reconnecting after a specific timeout and flush all commands
      // with a individual error
      return new Error("Retry time exhausted");
    }
    if (options.attempt > 10) {
      // End reconnecting with built in error
      return undefined;
    }
    // reconnect after
    return Math.min(options.attempt * 100, 3000);
  },
};

// 初始化 Redis，然后promise化 身上的方法
const client = promisifyAll(redis.createClient(options));

// 监听
client.on("error", (err) => {
  console.log("Redis Client Error:" + err);
});

/**
 * Redis 写入数据
 * @param {*} key 键
 * @param {*} val 值
 * @param {*} time 过期时间
 */
const setRedisVal = (key, val, time) => {
  if (!val && val !== 0) {
    throw new Error("Redis set error: 数据无效");
  }

  if (typeof time !== "undefined") {
    client.set(key, val, "EX", time);
  } else {
    client.set(key, val);
  }
};

/**
 * Redis 写入 hash 数据
 * @param {*} key 键
 * @param {*} obj 对象
 */
const setRedisHash = (key, obj) => {
  if (typeof obj !== "object") {
    throw new Error("Redis set error: 数据无效");
  }

  Object.keys(obj).forEach((item) => {
    client.hset(key, item, obj[item]);
  });
};

/**
 * Redis 读取 value
 * @param {*} key 键
 */
const getRedisVal = (key) => {
  return client.getAsync(key);
};

/**
 * Redis 读取 hash 数据
 * @param {*} key Hash对象的键
 * @param {*} item 属性键
 */
const getRedisHash = (key, item) => {
  return client.hgetAsync(key, item);
};

/**
 * Redis 读取 hash 全部数据
 * @param {*} key 键
 */
const getRedisHashAll = (key) => {
  return client.hgetallAsync(key);
};

/**
 * Redis 删除 数据
 * @param {*} key 键
 */
const delRedisVal = (key) => {
  client.del(key, (err, res) => {
    if (res === 1) {
      console.log("Redis：delete successfully");
    } else {
      console.log("Redis：delete redis key error：" + err);
    }
  });
};

module.exports = {
  setRedisVal,
  getRedisVal,
  setRedisHash,
  getRedisHash,
  getRedisHashAll,
  delRedisVal,
};
