const fs = require("fs");

const key = fs.readFileSync("./firebase-sdk-auth.json", "utf-8");
const encodeKey = Buffer.from(key).toString("base64");
console.log(encodeKey);
