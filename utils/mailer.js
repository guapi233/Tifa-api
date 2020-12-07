const nodemailer = require("nodemailer");
const config = require("../config/mailer");

const transporter = nodemailer.createTransport(config);

const defaultOptions = {
  ...config,
  from: "TIFA COMMUNITY <1290148953@qq.com>",
};

const send = async (options) => {
  options = Object.assign(defaultOptions, options);

  return new Promise((resolve, reject) => {
    transporter.sendMail(options, (err, info) => {
      err ? reject(err) : resolve(info);
    });
  });
};

// 验证码邮件格式
const sendMailAsVerifyCode = (mailInfo) => {
  const options = {
    to: mailInfo.email,
    subject: `【TIFA COMMUNITY】${mailInfo.title}提醒`,
    html: `
    <div
    style="
      width: 1000px;
      margin: 0 auto;
      box-shadow: 0 0 10px #00000070;
      overflow: hidden;
      font-size: 14px;
      line-height: 1.5;
    "
  >
    <div
      style="
        height: 50px;
        line-height: 50px;
        background: #3737ba;
        text-align: right;
        padding: 0 10px;
        display: flex;
        justify-content: space-between;
        color: #fff;
      "
    >
      <div>
        <span><b>TIFA COMMUNITY</b></span>
      </div>
      <div>
        <a style="color: #fff" href="http://localhost:8080" target="_blank"
          >主页</a
        >
      </div>
    </div>
    <div style="padding: 10px; background: #f5f5f5">
      尊敬的用户 ${mailInfo.name}，您好：
      <div style="padding: 10px">
        您正在进行${mailInfo.title}的操作，本次请求的邮件验证码是：<b>${mailInfo.content}</b>(为了保证您账号的安全性，请在${mailInfo.validTime}分钟内完成设置)。
        本验证码${mailInfo.validTime}分钟内有效，请及时输入。
        <div style="margin-top: 10px"></div>
        为保证账号安全，请勿泄漏此验证码。<br />
        如非本人操作，及时检查账号或联系<a
          href="https://www.baidu.com"
          target="_blank"
          >在线客服</a
        ><br />
        祝在【TIFA COMMUNITY】收获愉快！
        <div style="margin-top: 10px"></div>
        （这是一封自动发送的邮件，请不要直接回复）
      </div>
    </div>
  </div>
    `,
  };

  return send(options);
};

// 链接邮件格式
const sendMailAsLink = (mailInfo) => {
  const options = {
    to: mailInfo.email,
    subject: `【TIFA COMMUNITY】${mailInfo.title}提醒`,
    html: `
    <div
    style="
      width: 1000px;
      margin: 0 auto;
      box-shadow: 0 0 10px #00000070;
      overflow: hidden;
      font-size: 14px;
      line-height: 1.5;
    "
  >
    <div
      style="
        height: 50px;
        line-height: 50px;
        background: #3737ba;
        text-align: right;
        padding: 0 10px;
        display: flex;
        justify-content: space-between;
        color: #fff;
      "
    >
      <div>
        <span><b>TIFA COMMUNITY</b></span>
      </div>
      <div>
        <a style="color: #fff" href="http://localhost:8080" target="_blank"
          >主页</a
        >
      </div>
    </div>
    <div style="padding: 10px; background: #f5f5f5">
      尊敬的用户 ${mailInfo.name}，您好：
      <div style="padding: 10px">
        您正在进行${mailInfo.title}的操作，请点击以下链接完成此次操作(为了保证您账号的安全性，请在${mailInfo.validTime}分钟内完成设置)：<a href="${mailInfo.content}">${mailInfo.content}</a>
        链接${mailInfo.validTime}分钟内有效，如无法点击，请复制链接到浏览器访问。
        <div style="margin-top: 10px"></div>
        如非本人操作，及时检查账号或联系<a
          href="https://www.baidu.com"
          target="_blank"
          >在线客服</a
        ><br />
        祝在【TIFA COMMUNITY】收获愉快！
        <div style="margin-top: 10px"></div>
        （这是一封自动发送的邮件，请不要直接回复）
      </div>
    </div>
  </div>
    `,
  };

  return send(options);
};

module.exports = {
  sendMailAsVerifyCode,
  sendMailAsLink,
};
