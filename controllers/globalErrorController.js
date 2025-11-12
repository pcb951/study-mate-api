const AppError = require("../utils/appError");

function handleDuplicateError(err) {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `${field} '${value}' already exists. Please use another value!`;
  return new AppError(message, 400);
}

function handleCastError(err) {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
}
function handleJWTerror() {
  return new AppError("Please login first!", 401);
}

const sendDevError = (err, res) => {
  res.status(err.statusCode || 500).json({
    status: err.status || "error",
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendProductionError = (err, res) => {
  console.log(err);
  // Don't send accidentally other error
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // when it was not operational error send the default error
    res.status(500).json({
      status: "error",
      message: "something went very wrong!",
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendDevError(err, res);
  } else {
    // handle specific errors first
    let error = { ...err };
    error.message = err.message;

    if (err.code === 11000) error = handleDuplicateError(err);
    if (err.name === "CastError") error = handleCastError(err);
    if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError")
      error = handleJWTerror();

    sendProductionError(error, res);
  }
};
