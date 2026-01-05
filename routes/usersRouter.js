const express = require("express");
const authController = require("./../controllers/authController");
const userController = require("./../controllers/userController");

const router = express.Router();

router
  .route("/me")
  .get(authController.protect, userController.me, userController.getMe);
// public routes
router.route("/").get(userController.getAllUser);
router.route("/social-login").post(authController.socialLogin);
router.route("/signup").post(authController.signup);
router.route("/login").post(authController.login);
router.route("/:id").get(userController.getUser);

// protected routes
router.use(authController.protect);
router.route("/updateMe").patch(userController.updateUser);
router.route("/updatePassword").patch(authController.updatePassword);

module.exports = router;
