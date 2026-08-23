const httpStatus = require("http-status");
const pick = require("../utils/pick");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const response = require("../config/response");
const { userService } = require("../services");
const { campaignService } = require("../services");
const unlinkImages = require("../common/unlinkImage");

const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  res
    .status(httpStatus.CREATED)
    .json(
      response({
        message: "User Created",
        status: "OK",
        statusCode: httpStatus.CREATED,
        data: user,
      })
    );
});


const getUsers = catchAsync(async (req, res) => {
  // Extract filters and options from query params
  const filter = pick(req.query, [
    'fullName',
    'role',
    'gender',
    'interests',
    'socialMedia',
    'platform',
    'minFollowers',
    'address',
    'isBanned',
    'isSuspended',
    'isSubscribe',
  ]);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const result = await userService.queryUsers(filter, options);

  res.status(httpStatus.OK).json(
    response({
      message: 'All Users',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: result,
    })
  );
});

 

 






const loggedInUser = catchAsync(async (req, res) => {
  const user = await userService.loggedInUser(req.user.id);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const userData = user.toJSON ? user.toJSON() : user;
  if (user.role === "influencer") {
    userData.completedCampaignsCount = await campaignService.getCompletedCampaignsCount(user.id);
  }

  res
    .status(httpStatus.OK)
    .json(
      response({
        message: "User",
        status: "OK",
        statusCode: httpStatus.OK,
        data: userData,
      })
    );
});

const getUser = catchAsync(async (req, res) => {
  let user = await userService.getUserById(req.params.userId);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const userData = { user: user.toJSON ? user.toJSON() : user };
  if (user.role === "influencer") {
    userData.completedCampaignsCount = await campaignService.getCompletedCampaignsCount(user.id);
  }

  res
    .status(httpStatus.OK)
    .json(
      response({
        message: "User",
        status: "OK",
        statusCode: httpStatus.OK,
        data: userData,
      })
    );
});

// const updateUser = catchAsync(async (req, res) => {

  // const image = {};
  // if (req.file) {
  //   image.url = "/uploads/users/" + req.file.filename;
  //   image.path = req.file.path;
  // }
  // if (req.file) {
  //   req.body.image = image;
  // }

//   const user = await userService.updateUserById(req.params.userId, req.body);

//   res
//     .status(httpStatus.OK)
//     .json(
//       response({
//         message: "User Updated",
//         status: "OK",
//         statusCode: httpStatus.OK,
//         data: user,
//       })
//     );
// });


const { applyUploadedImage } = require('../utils/uploadToCloudinary');

const updateUser = catchAsync(async (req, res) => {
  applyUploadedImage(req);

  // Parse socialMedia if stringified JSON (form-data)
  if (req.body.socialMedia && typeof req.body.socialMedia === 'string') {
    try {
      req.body.socialMedia = JSON.parse(req.body.socialMedia);
    } catch (e) {
      return res.status(400).json({
        message: 'Invalid JSON format for socialMedia',
        status: 'BAD_REQUEST',
        statusCode: 400,
      });
    }
  }

  // Parse interests if stringified JSON (form-data)
  if (req.body.interests && typeof req.body.interests === 'string') {
    try {
      req.body.interests = JSON.parse(req.body.interests);
    } catch (e) {
      return res.status(400).json({
        message: 'Invalid JSON format for interests',
        status: 'BAD_REQUEST',
        statusCode: 400,
      });
    }
  }

  const user = await userService.updateUserById(req.params.userId, req.body);

  res.status(httpStatus.OK).json(
    response({
      message: 'User Updated',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: user,
    })
  );
});



const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res
    .status(httpStatus.OK)
    .json(
      response({
        message: "User Deleted",
        status: "OK",
        statusCode: httpStatus.OK,
        data: {},
      })
    );
});

const moderateUser = catchAsync(async (req, res) => {
  const user = await userService.moderateUser(req.params.userId, req.body);
  res.status(httpStatus.OK).json(
    response({
      message: "User moderation updated",
      status: "OK",
      statusCode: httpStatus.OK,
      data: user,
    })
  );
});


module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  loggedInUser,
  moderateUser,
};
