require("@dotenvx/dotenvx").config();
const express = require("express");
const morgan = require("morgan");

// create the app
const app = express();

// use json form data parsing middleware
app.use(express.json());

// requests are logging console
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.all("/*splat", (req, res) => {
  res.status(404).json({
    status: "fail",
    message: `can't find ${req.originalUrl} on this server`,
  });
});

// export the app from file
module.exports = app;
