const express = require("express");
const authController = require("./../controllers/authController");
const friendshipController = require("./../controllers/friendshipController");

const router = express.Router();

router.use(authController.protect);
router.route("/all-friends/:id").get(friendshipController.allFriends);
router
  .route("/all-requested-friends/:id")
  .get(friendshipController.allFriendsRequest);
router.route("/send-request").post(friendshipController.sendFriendRequest);
router.route("/accept-request").post(friendshipController.acceptFriendRequest);
router.route("/unfriend").post(friendshipController.unfriend);

module.exports = router;
