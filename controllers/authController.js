require("@dotenvx/dotenvx").config();
const { promisify } = require("util");
const User = require("./../models/userModel");
const jwt = require("jsonwebtoken");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const firebaseAdmin = require("firebase-admin");

const SDK_API_KEY = Buffer.from(
  process.env.FIREBASE_SDK_API_KEY,
  "base64"
).toString("utf-8");

const serviceAccount = JSON.parse(SDK_API_KEY);

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
});

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

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("Please login first", 401));
  }

  const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decode.id);
  if (!currentUser) {
    return next(new AppError("Please Create Account First", 401));
  }

  if (currentUser.isPasswordChanged(decode.iat)) {
    return next(new AppError("Please Login!", 401));
  }

  // grant access to protected route
  req.user = currentUser;
  next();
});

// social login
exports.socialLogin = catchAsync(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("Please login first", 401));
  }
  const decode = await firebaseAdmin.auth().verifyIdToken(token);
  console.log(decode);
});
