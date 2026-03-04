// src/models/User.js
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true, // Null for Google OAuth users
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'first_name',
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'last_name',
    },
    mobile: {
      type: DataTypes.STRING(15),
      allowNull: true,
      unique: true,
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'date_of_birth',
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM('user', 'admin', 'moderator'),
      defaultValue: 'user',
    },
    authProvider: {
      type: DataTypes.ENUM('local', 'google'),
      defaultValue: 'local',
      field: 'auth_provider',
    },
    googleId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      field: 'google_id',
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_email_verified',
    },
    isMobileVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_mobile_verified',
    },
    isProfileComplete: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_profile_complete',
    },
    profileCompletionStep: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'profile_completion_step',
    },
    accountStatus: {
      type: DataTypes.ENUM('pending', 'active', 'suspended', 'blocked'),
      defaultValue: 'pending',
      field: 'account_status',
    },
    adminApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'admin_approved',
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login_at',
    },
    otpSecret: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'otp_secret',
    },
    otpExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'otp_expires_at',
    },
    otpAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'otp_attempts',
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'refresh_token',
    },
    subscriptionPlan: {
      type: DataTypes.ENUM('free', 'basic', 'premium', 'gold'),
      defaultValue: 'free',
      field: 'subscription_plan',
    },
    subscriptionExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'subscription_expires_at',
    },
  },
  {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeSave: async (user) => {
        if (user.changed('password') && user.password) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

User.prototype.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toSafeJSON = function () {
  const { password, otpSecret, refreshToken, googleId, ...safeData } = this.toJSON();
  return safeData;
};

module.exports = User;
