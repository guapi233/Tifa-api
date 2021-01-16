# Tifa-api
🛠【v1.0】Tifa是一款兴趣社交平台应用，这里是后台，[web端请戳这里](https://github.com/guapi233/Tifa-web)



## 技术栈

* koa
* koa常用中间件
* mongoose
* nodemailer
* redis
* socket.io
* axios
* jsonwebtoken



## 项目运行

```shell
git clone https://github.com/guapi233/Tifa-api.git

cd Tifa-api

npm install

npm run dev
```

注：如果要测试邮件api，需要在`config`目录下提供一个`mailer.js`文件，提供邮件发送端的信息，内容如下示例：

```js
const mailer = {
  host: "smtp.qq.com",
  post: 9797,
  auth: {
    user: "xxx@qq.com",
    pass: "xxxxxx",
  },
};

module.exports = mailer;
```



## LICENSE

[WTFPL](https://github.com/guapi233/Tifa-api/blob/main/LICENSE)