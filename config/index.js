const DB_URL = "mongodb://localhost/Tifa";

const JWT_SECRET = "hi man, I think you are a gay!";

const REDIS = {
  host: "localhost",
  port: 6379,
};

const CAPTCHA_LIFE = 10 * 60;

module.exports = {
  DB_URL,
  REDIS,
  JWT_SECRET,
  CAPTCHA_LIFE,
};
