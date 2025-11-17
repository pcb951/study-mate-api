const express = require("express");
const authController = require("./../controllers/authController");
const userController = require("./../controllers/userController");

const router = express.Router();

// public routes
router.route("/").get(userController.getAllUser);
router.route("/social-login").post(authController.socialLogin);
router.route("/signup").post(authController.signup);
router.route("/login").post(authController.login);

// protected routes
router.use(authController.protect);
router.route("/me").get(userController.me, userController.getUser);
router.route("/:id").get(userController.getUser);
router.route("/updateMe").patch(userController.updateUser);

module.exports = router;
