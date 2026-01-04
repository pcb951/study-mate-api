require("@dotenvx/dotenvx").config();
const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const userRouter = require("./routes/usersRouter");
const friendshipRouter = require("./routes/friendshipRouter");
const globalErrorHandler = require("./controllers/globalErrorController");
const cors = require("cors");

// create the app
const app = express();

// middlewares
app.use(cookieParser());
// use json form data parsing middleware
app.use(express.json());

app.use(cors());

// requests are logging console
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Hello from server!",
  });
});

app.post("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "This route You only test the server! Hello from server!",
  });
});

app.patch("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "This route You only test the server! Hello from server!",
  });
});

app.put("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "This route You only test the server! Hello from server!",
  });
});

app.delete("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "This route You only test the server! Hello from server!",
  });
});

// routers
app.use("/api/v2/users", userRouter);
app.use("/api/v2/friendships", friendshipRouter);

// handel unrecognized routes
app.all("/*splat", (req, res) => {
  res.status(404).json({
    status: "fail",
    message: `can't find ${req.originalUrl} on this server`,
  });
});

// global error handling middleware
app.use(globalErrorHandler);

// export the app from file
module.exports = app;
