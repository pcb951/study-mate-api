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
  return jwt.sign({ id: user._id }, process.env.ACCESS_JWT_SECRET, {
    expiresIn: process.env.ACCESS_JWT_EXPIRES_IN,
  });
};

// send jwt cookie and response

function setJwtToken(user, statusCode, res) {
  const accessToken = createAccessToken(user);

  res.status(statusCode).json({
    status: "success",
    token: accessToken,
  });
}

// handel signup
exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm, birthdate } = req.body;
  console.log(name, email, password, passwordConfirm, birthdate);

  if (!password || !passwordConfirm) {
    return next(
      new AppError("Please provide password and passwordConfirm", 400)
    );
  }

  if (password !== passwordConfirm) {
    return next(new AppError("Passwords do not match!", 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(
      new AppError("This email is already registered. Please login.", 400)
    );
  }

  console.log(email);

  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm,
    birthdate,
    authProvider: "mongodb",
  });

  console.log(newUser);

  newUser.password = undefined; // hide password

  setJwtToken(newUser, 201, res);
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

  setJwtToken(user, 200, res);
});

// make sure user is login

exports.protect = catchAsync(async (req, res, next) => {
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

  const decode = await promisify(jwt.verify)(
    token,
    process.env.ACCESS_JWT_SECRET
  );

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

// handel social login
exports.socialLogin = catchAsync(async (req, res, next) => {
  let token;
  if (req.body.googleAuthToken) {
    token = req.body.googleAuthToken;
  }

  if (!token) {
    return next(new AppError("Please login first", 401));
  }
  let decode;
  try {
    decode = await firebaseAdmin.auth().verifyIdToken(token);
  } catch (err) {
    console.error("Firebase token verification failed:", err);
    return next(new AppError("Invalid Firebase token", 401));
  }

  const { uid, email, name, picture } = decode;
  const provider = "firebase";

  let user = await User.findOne({ email });

  if (user && user.authProvider !== provider) {
    return next(
      new AppError(
        `This email is already registered using ${user.authProvider}. Please use that login method.`,
        400
      )
    );
  }

  if (!user) {
    const ratingAverage = Number(Math.random() * 4 + 1).toFixed(1);
    user = await User.create({
      name: name || "No Name",
      email,
      image: picture || "",
      authProvider: provider,
      firebaseUid: uid,
      ratingAverage,
    });
  }

  setJwtToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { password, passwordConfirm } = req.body;

  if (!password || !passwordConfirm) {
    return next(
      new AppError("Please provide password and passwordConfirm", 400)
    );
  }

  if (password !== passwordConfirm) {
    return next(new AppError("Passwords are not the same", 400));
  }

  const user = await User.findById(req.user.id).select("+password");

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  user.password = password;
  user.passwordConfirm = passwordConfirm;

  await user.save();
  setJwtToken(user, 200, res);
});
