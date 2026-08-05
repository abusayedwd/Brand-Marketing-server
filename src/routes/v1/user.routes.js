const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const userValidation = require("../../validations/user.validation");
const userController = require("../../controllers/user.controller");
const userFileUploadMiddleware = require("../../middlewares/fileUpload");
const convertHeicToPngMiddleware = require("../../middlewares/converter");
const cloudinaryUpload = require("../../middlewares/cloudinaryUpload");

const uploadUsers = userFileUploadMiddleware();

const router = express.Router();


router.route("/").get( userController.getUsers);

router.route("/loggedInUser").get(auth("common"), userController.loggedInUser);

router
  .route("/:userId/moderate")
  .patch(auth("admin"), userController.moderateUser);

router
  .route("/:userId")
  .get(auth("common"), validate(userValidation.getUser), userController.getUser)
  .patch(
    auth("common"),
    uploadUsers.single("image"),
    convertHeicToPngMiddleware(),
    cloudinaryUpload("brivio/users"),
    userController.updateUser
  );

module.exports = router;
