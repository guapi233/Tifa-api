const redis = require("./utils/redis");

const main = async () => {
  redis.setRedisVal("name", "崔永杰");

  let name = await redis.getRedisVal("name");
  console.log(name, "1");

  redis.setRedisHash("obj", {
    age: 18,
    address: "内丘",
  });

  let objAge = await redis.getRedisHash("obj", "age");
  console.log(objAge, "2");

  let obj = await redis.getRedisHashAll("obj");
  console.log(JSON.stringify(obj), "3");

  redis.delRedisVal("name");
  name = await redis.getRedisVal("name");
  console.log(name, "4");
};

main();
