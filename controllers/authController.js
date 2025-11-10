require("@dotenvx/dotenvx").config();
const { promisify } = require("util");
const User = require("./../models/userModel");
const jwt = require("jsonwebtoken");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const firebaseAdmin = require("firebase-admin");

// handel firebase-sdk

const SDK_API_KEY = Buffer.from(
  process.env.FIREBASE_SDK_API_KEY,
  "base64"
).toString("utf-8");

const serviceAccount = JSON.parse(SDK_API_KEY);

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
});

// handel jwt

const createAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, tokenVersion: user.tokenVersion },
    process.env.ACCESS_JWT_SECRET,
    { expiresIn: process.env.ACCESS_JWT_EXPIRES_IN }
  );
};

const createRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id, tokenVersion: user.tokenVersion },
    process.env.REFRESH_JWT_SECRET,
    { expiresIn: process.env.REFRESH_JWT_EXPIRES_IN }
  );
};

// send jwt cookie and response

function sendJwtCookies(user, statusCode, res) {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

  const refreshCookieOptions = {
    expires: new Date(
      Date.now() +
        parseInt(process.env.REFRESH_JWT_EXPIRES_IN) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/v1/users/refresh_token",
  };

  res.cookie("refreshToken", refreshToken, refreshCookieOptions);

  res.status(statusCode).json({
    status: "success",
    token: accessToken,
  });
}

// handel signup

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

// handel login

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

// make sure user is login

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

  const decode = await promisify(jwt.verify)(
    token,
    process.env.ACCESS_JWT_SECRET
  );

  const currentUser = await User.findById(decode.id);
  if (!currentUser) {
    return next(new AppError("Please Create Account First", 401));
  }

  if (currentUser.tokenVersion !== decoded.tokenVersion) {
    return next(new AppError("Please login again.", 401));
  }

  if (currentUser.isPasswordChanged(decode.iat)) {
    return next(new AppError("Please Login!", 401));
  }

  // grant access to protected route
  req.user = currentUser;
  next();
});

// refresh jwt token after 15 minute

exports.refreshToken = catchAsync(async (req, res, next) => {
  // 1 Get refresh token from HTTP-only cookie
  const token = req.cookies.refreshToken;
  if (!token) {
    return next(new AppError("No refresh token provided. Please login.", 401));
  }

  // 2 Verify refresh token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.REFRESH_JWT_SECRET);
  } catch (err) {
    return next(
      new AppError("Invalid or expired refresh token. Please login.", 401)
    );
  }

  // 3 Check if user exists
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError("User not found. Please login.", 401));
  }

  // 4 Check token version
  if (user.tokenVersion !== decoded.tokenVersion) {
    return next(
      new AppError("Refresh token revoked. Please login again.", 401)
    );
  }

  // 5 Issue new tokens
  const newAccessToken = createAccessToken(user);
  const newRefreshToken = createRefreshToken(user);

  // 6 Send new refresh token as cookie
  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/v1/users/refresh_token",
    expires: new Date(
      Date.now() +
        parseInt(process.env.REFRESH_JWT_EXPIRES_IN) * 24 * 60 * 60 * 1000
    ),
  });

  // 7 Send new access token in response
  res.status(200).json({
    status: "success",
    token: newAccessToken,
  });
});

// handel social login
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

exports.logout = catchAsync(async (req, res, next) => {
  const userId = req.user ? req.user._id : req.body.userId;

  if (!userId) {
    return next(new AppError("User not found", 400));
  }

  // 1 Increment tokenVersion in DB
  const user = await User.findByIdAndUpdate(userId, {
    $inc: { tokenVersion: 1 },
  });

  const cookieOption = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/v1/users/refresh_token",
    expires: new Date(0), // Set cookie expiry to past date
  };

  // 2 Clear refresh token cookie
  res.cookie("refreshToken", "", cookieOption);

  // 3 Optional: send response
  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
});
