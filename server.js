require("@dotenvx/dotenvx").config();
const server = require("./app");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 3000;

const DB = process.env.DB_URL.replace("<PASSWORD>", process.env.DB_PASSWORD);

mongoose
  .connect(DB)
  .then(() => {
    console.log("DATABASE CONNECTED!");
  })
  .catch((err) => {
    console.log("DATABASE CONNECTIO FAILED ERROR!", err);
  });

server.listen(PORT, () => {
  console.log(`server listen on ${PORT}`);
});

process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  console.log("unhandledRejection! shutting done...");
  server.close(() => {
    process.exit(1);
  });
});

process.on("uncaughtException", (err) => {
  console.log(err.name, err.message);
  console.log("uncaughtException! shutting done...");
  server.close(() => {
    process.exit(1);
  });
});
