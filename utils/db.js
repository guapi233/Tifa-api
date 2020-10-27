const mongoose = require("mongoose");
const config = require("../config/index");

// 连接 MongoDB
mongoose.connect(config.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

// 监听
mongoose.connection.once("connected", () => {
  console.log("Mongoose connection open to " + config.DB_URL);
});

mongoose.connection.on("error", (err) => {
  console.log("Mongoose connection appear error: " + err);
});

mongoose.connection.once("disconnected", () => {
  console.log("Mongoose connection disconected");
});

module.exports = mongoose;
