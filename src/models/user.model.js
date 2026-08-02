 


const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const { toJSON, paginate } = require("./plugins");
const { roles } = require("../config/roles");

const userSchema = mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      default: "",
    },
    userName: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error("Invalid email");
        }
      },
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true, // allows multiple docs without phoneNumber
      trim: true,
    },
    image: {
      type: Object,
      required: [true, "Image is required"],
      default: { url: `/uploads/users/user-1752036041119.jpg`, path: "null" },
    },
    password: {
      type: String,
      minlength: 8,
      trim: true,
      validate(value) {
        if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
          throw new Error(
            "Password must contain at least one letter and one number"
          );
        }
      },
      private: true,
    },
    role: {
      type: String,
      enum: roles,
      required: true,
    },
      walletBalance: {
      type: Number,
      default: 0,
  },
    rand: {
      type: Number,
      default: 0,
    },
    dateOfBirth: {
       type: String,
       required: true,
       default: "22-04-25"
    },
socialMedia: [
  {
    platform: { type: String },
    url: { type: String },
    followers: { type: String },  
  },
],
    interests: {
      type: [String],
      default: [],
    },
    bio: {
      type: String,
      maxlength: 500,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    // Brand-specific fields
    companyName: {
      type: String,
      default: "",
    },
    industry: {
      type: String,
      default: "",
    },
    website: {
      type: String,
      default: "",
      validate: {
        validator: (v) => !v || validator.isURL(v),
        message: "Invalid URL",
      },
    },
    companyDescription: {
      type: String,
      maxlength: 1000,
      default: "",
    },
    previousExperience: {
      type: String,
      enum: ["none", "limited", "moderate", "extensive"],
      default: "none",
    },

    oneTimeCode: {
      type: String,
      default: "",
    },
    planName: {
      type: String,
      default: "no-plan",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    acceptTerms: {
      type: Boolean, 
      default: false,
    },
    isResetPassword: {
      type: Boolean,
      default: false,
    },
    isInterest: {
      type: Boolean,
      default: false,
    },
    isSubscribe: {
      type: Boolean,
      default: false,
    },
    isProfileCompleted: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    moderationNote: {
      type: String,
      default: "",
    },
     subscriptionId : {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlanSubscription",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// add plugins that convert mongoose to json and add paginate functionality
userSchema.plugin(toJSON);
userSchema.plugin(paginate);

// Static method to check if email is taken
userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

// Static method to check if phone number is taken
userSchema.statics.isPhoneNumberTaken = async function (phoneNumber, excludeUserId) {
  const user = await this.findOne({ phoneNumber, _id: { $ne: excludeUserId } });
  return !!user;
};

// Instance method to compare password
userSchema.methods.isPasswordMatch = async function (password) {
  return bcrypt.compare(password, this.password);
};

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 8);
  }
  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
