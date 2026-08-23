const httpStatus = require("http-status");
const { User } = require("../models");
const ApiError = require("../utils/ApiError");
const { sendEmailVerification } = require("./email.service");
const unlinkImages = require("../common/unlinkImage");
const PlanSubscription = require("../models/payment.model");

const createUser = async (userBody) => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email already taken");
  }
  const oneTimeCode = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
  console.log(oneTimeCode)

  if (userBody.role === "brand" || userBody.role === "user" || userBody.role === "influencer" || userBody.role === "admin") {

    sendEmailVerification(userBody.email, oneTimeCode);
  }
  return User.create({ ...userBody, oneTimeCode });
};


 

// const queryUsers = async (filter, options) => {
//   const query = {};

 


//   for (const key of Object.keys(filter)) {
//     if ((key === 'fullName' || key === 'email' || key === 'userName') && filter[key] !== '') {
//       query[key] = { $regex: filter[key], $options: 'i' }; // case-insensitive partial match
//     } else if (key === 'interests' && filter[key] !== '') {
//       // filter[key] can be comma-separated string or single interest
//       // Convert to array if string contains commas
//       let interestsArray = [];
//       if (typeof filter[key] === 'string') {
//         interestsArray = filter[key].split(',').map((i) => i.trim());
//       } else if (Array.isArray(filter[key])) {
//         interestsArray = filter[key];
//       }

//       query.interests = { $in: interestsArray };
//     } else if (key === 'socialMedia' && filter[key] !== '') {
//       // filter[key] is platform name, can also be comma-separated
//       let platforms = [];
//       if (typeof filter[key] === 'string') {
//         platforms = filter[key].split(',').map((p) => p.trim());
//       } else if (Array.isArray(filter[key])) {
//         platforms = filter[key];
//       }

//       query.socialMedia = { $elemMatch: { platform: { $in: platforms } } };
//     } else if (filter[key] !== '') {
//       query[key] = filter[key];
//     }
//   }

//   // No need to set default sortBy here anymore - paginate function handles it
//   const users = await User.paginate(query, options);
//   const populatedUsers = await User.populate("subscriptionId");

//   return users;
// };

 
 
const queryUsers = async (filter, options) => {
  const query = { isDeleted: { $ne: true } };
  const { minFollowers, platform, address, ...rest } = filter;

  for (const key of Object.keys(rest)) {
    if ((key === 'fullName' || key === 'email' || key === 'userName') && rest[key] !== '') {
      query[key] = { $regex: rest[key], $options: 'i' };
    } else if (key === 'interests' && rest[key] !== '') {
      let interestsArray = [];
      if (typeof rest[key] === 'string') {
        interestsArray = rest[key].split(',').map((i) => i.trim());
      } else if (Array.isArray(rest[key])) {
        interestsArray = rest[key];
      }
      query.interests = { $in: interestsArray };
    } else if (key === 'socialMedia' && rest[key] !== '') {
      let platforms = [];
      if (typeof rest[key] === 'string') {
        platforms = rest[key].split(',').map((p) => p.trim());
      } else if (Array.isArray(rest[key])) {
        platforms = rest[key];
      }
      query.socialMedia = { $elemMatch: { platform: { $in: platforms } } };
    } else if (rest[key] !== '' && rest[key] !== undefined) {
      query[key] = rest[key];
    }
  }

  if (platform) {
    query.socialMedia = {
      ...(query.socialMedia || {}),
      $elemMatch: {
        ...(query.socialMedia?.$elemMatch || {}),
        platform: { $regex: new RegExp(platform, 'i') },
      },
    };
  }

  if (minFollowers) {
    const min = Number(minFollowers) || 0;
    query.socialMedia = {
      ...(query.socialMedia || {}),
      $elemMatch: {
        ...(query.socialMedia?.$elemMatch || {}),
        followers: { $regex: /\d/ },
      },
    };
    // Keep numeric string followers filter soft; clients can refine further
    query.$expr = {
      $gte: [
        {
          $max: {
            $map: {
              input: { $ifNull: ['$socialMedia', []] },
              as: 'sm',
              in: {
                $convert: {
                  input: {
                    $replaceAll: {
                      input: { $toString: '$$sm.followers' },
                      find: ',',
                      replacement: '',
                    },
                  },
                  to: 'double',
                  onError: 0,
                  onNull: 0,
                },
              },
            },
          },
        },
        min,
      ],
    };
  }

  if (address) {
    query.address = { $regex: address, $options: 'i' };
  }

  const users = await User.paginate(query, {
    ...options,
    populate: 'subscriptionId',
  });

  return users;
};

const moderateUser = async (userId, { isBanned, isSuspended, isEmailVerified, moderationNote }) => {
  const user = await getUserById(userId);
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');

  if (typeof isBanned === 'boolean') user.isBanned = isBanned;
  if (typeof isSuspended === 'boolean') user.isSuspended = isSuspended;
  if (typeof isEmailVerified === 'boolean') user.isEmailVerified = isEmailVerified;
  if (moderationNote !== undefined) user.moderationNote = moderationNote;

  await user.save();

  try {
    const { createNotification } = require('./notification.service');
    let title = 'Account update';
    let message = 'Your account status was updated by admin.';
    if (user.isBanned) {
      title = 'Account banned';
      message = moderationNote || 'Your account has been banned.';
    } else if (user.isSuspended) {
      title = 'Account suspended';
      message = moderationNote || 'Your account has been suspended.';
    }
    await createNotification({
      userId: user.id,
      title,
      message,
      type: 'moderation',
      email: true,
    });
  } catch (_) {}

  return user;
};


 


const getUserById = async (id) => {
  return User.findById(id);
};

const loggedInUser = async (id) => {
  return User.findById(id);
};

const getUserByEmail = async (email) => {
  return User.findOne({ email });
};

// const updateUserById = async (userId, updateBody, files) => {
//   const user = await getUserById(userId);

//   if (!user) {
//     throw new ApiError(httpStatus.NOT_FOUND, "User not found");
//   }

//   if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
//     throw new ApiError(httpStatus.BAD_REQUEST, "Email already taken");
//   }

  // if (files && files.length > 0) {
  //   updateBody.photo = files;
  // } else {
  //   delete updateBody.photo; // remove the photo property from the updateBody if no new photo is provided
  // }

//   Object.assign(user, updateBody);
//   await user.save();
//   return user;
// };



const updateUserById = async (userId, updateBody) => {

  const user = await getUserById(userId);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Check email uniqueness if changed
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  
  if (updateBody.image && typeof updateBody.image === 'object') {
    updateBody.image = updateBody.image.url || '';
  }
  if (typeof updateBody.image === 'string' && updateBody.image.startsWith('/uploads/')) {
    delete updateBody.image;
  }

  user.set(updateBody);
  if (typeof updateBody.image === 'string') {
    user.image = updateBody.image;
    user.markModified('image');
  }

  await user.save();

  return user;
};

const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  await user.remove();
  return user;
};

const isUpdateUser = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const oneTimeCode =
    Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;


  if (updateBody.role === "user" || updateBody.role === "brand" || updateBody.role === "influencer") {
    sendEmailVerification(updateBody.email, oneTimeCode);
  }

  Object.assign(user, updateBody, {
    isDeleted: false,
    isSuspended: false,
    isEmailVerified: false,
    isResetPassword: false,
    isPhoneNumberVerified: false,
    oneTimeCode: oneTimeCode,
  });
  await user.save();
  return user;
};

module.exports = {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
  isUpdateUser,
  loggedInUser,
  moderateUser,
};