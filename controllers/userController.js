const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const User = require("./../models/userModel");

exports.me = catchAsync(async (req, res, next) => {
  req.params.id = req.user.id;
  next();
});

exports.getAllUser = catchAsync(async (req, res, next) => {
  const queryObject = { ...req.query };
  console.log(queryObject);

  const query = User.find(queryObject);

  const users = await query;

  if (!users || users.length === 0) {
    return next(new AppError("No user Found!", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      users,
    },
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const user = await User.findById(id);

  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

function filterObj(obj, ...allowedFields) {
  const newObject = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObject[el] = obj[el];
    }
  });

  return newObject;
}

exports.updateUser = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.confirmPassword) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /api/v1/users/updatePassword.",
        400
      )
    );
  }
  const id = req.params.id;
  const updates = req.body;

  const filterBody = filterObj(
    updates,
    "name",
    "profileImage",
    "subject",
    "studyMode",
    "availability",
    "experienceLevel",
    "location"
  );

  const updatedUser = await User.findByIdAndUpdate(id, filterBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    message: "user updated successfully!",
  });
});
