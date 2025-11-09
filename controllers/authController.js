require("@dotenvx/dotenvx").config();
const User = require("./../models/userModel");
const jwt = require("jsonwebtoken");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");

function signJsonWebToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}

function sendJwtCookies(user, statusCode, res) {
  const token = signJsonWebToken(user._id);

  const cookiesOptions = {
    expires: new Date(
      Date.now() + parseInt(process.env.COOKIES_EXPIRE_IN * 24 * 60 * 60 * 1000)
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
  res.cookie("token", token, cookiesOptions);

  res.status(statusCode).json({
    status: "success",
    token,
  });
}

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    image: req.body.image,
    role: req.body.role,
    authProvider: "mongodb",
  });

  // hidden the password fields
  newUser.password = undefined;

  sendJwtCookies(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) check if email and password exist
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  // 2) check if user exists && password is correct
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  sendJwtCookies(user, 200, res);
});
