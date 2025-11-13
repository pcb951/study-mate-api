const catchAsync = require("./../utils/catchAsync");
const Friendship = require("./../models/friendShipModel");
const AppError = require("./../utils/appError");

exports.allFriends = catchAsync(async (req, res, next) => {
  const userId = req.params.id;

  const friendships = await Friendship.find({
    $or: [
      { requester: userId, status: "accepted" },
      { recipient: userId, status: "accepted" },
    ],
  });

  if (!friendships) {
    return next(new AppError("No friends found", 404));
  }

  res.status(200).json({
    status: "success",
    massage: "Friends retrieved successfully",
    data: friendships,
  });
});

exports.allFriendsRequest = catchAsync(async (req, res, next) => {
  const userId = req.params.id;

  const friendships = await Friendship.find({
    $or: [
      { requester: userId, status: "pending" },
      { recipient: userId, status: "pending" },
    ],
  });

  if (!friendships) {
    return next(new AppError("No friends request found", 404));
  }

  res.status(200).json({
    status: "success",
    massage: "Friends retrieved successfully",
    data: friendships,
  });
});

exports.sendFriendRequest = catchAsync(async (req, res, next) => {
  const requesterId = req.user._id;
  const { recipientId } = req.body;

  if (requesterId === recipientId) {
    return next(new AppError("You con't sent friend request to yourself", 400));
  }
  const exitingFriendShip = await Friendship.findRelation(
    requesterId,
    recipientId
  );

  if (exitingFriendShip) {
    return next(
      new AppError(
        "Friend request already sent or you are already friends",
        400
      )
    );
  }

  const newFriendShip = await Friendship.create({
    requester: requesterId,
    recipient: recipientId,
  });

  res.status(201).json({
    status: "success",
    message: "Friend request sent successfully!",
    data: newFriendShip,
  });
});

exports.acceptFriendRequest = catchAsync(async (req, res, next) => {
  const recipientId = req.user._id;
  const { requesterId } = req.body;

  const friendship = await Friendship.findOneAndUpdate(
    {
      requester: requesterId,
      recipient: recipientId,
      status: "pending",
    },
    { status: "accepted" },
    { new: true }
  );

  if (!friendship) {
    return next(new AppError("No pending friend request found", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Friend request accepted successfully!",
    data: friendship,
  });
  exports.unfriend = catchAsync(async (req, res, next) => {
    const requesterId = req.user._id;
    const { recipientId } = req.body;

    const friendship = await Friendship.findOneAndDelete({
      $or: [
        { requester: requesterId, recipient: recipientId, status: "accepted" },
        { requester: recipientId, recipient: requesterId, status: "accepted" },
      ],
    });

    if (!friendship) {
      return next(new AppError("No existing friendship found", 404));
    }

    res.status(200).json({
      status: "success",
      message: "Unfriended successfully!",
    });
  });

  exports.unfriend = catchAsync(async (req, res, next) => {
    const requesterId = req.user._id;
    const { recipientId } = req.body;

    const friendship = await Friendship.findOneAndDelete({
      $or: [
        { requester: requesterId, recipient: recipientId, status: "accepted" },
        { requester: recipientId, recipient: requesterId, status: "accepted" },
      ],
    });

    if (!friendship) {
      return next(new AppError("No existing friendship found", 404));
    }

    res.status(200).json({
      status: "success",
      message: "Unfriended successfully!",
    });
  });
});
