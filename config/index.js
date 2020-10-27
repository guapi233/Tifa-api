// MongoDB地址
const DB_URL = "mongodb://localhost/Tifa";

// JWT密钥
const JWT_SECRET = "hi man, I think you are a gay!";

// Redis配置
const REDIS = {
  host: "localhost",
  port: 6379,
};

// 验证码有效期
const CAPTCHA_LIFE = 10 * 60;

module.exports = {
  DB_URL,
  REDIS,
  JWT_SECRET,
  CAPTCHA_LIFE,
};
