// src/models/PersonalDetails.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PersonalDetails = sequelize.define(
  'PersonalDetails',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true, field: 'user_id' },
    maritalStatus: {
      type: DataTypes.ENUM('never_married', 'divorced', 'widowed', 'awaiting_divorce'),
      field: 'marital_status',
    },
    height: { type: DataTypes.DECIMAL(5, 2), allowNull: true, comment: 'Height in cm' },
    weight: { type: DataTypes.DECIMAL(5, 2), allowNull: true, comment: 'Weight in kg' },
    motherTongue: { type: DataTypes.STRING(100), allowNull: true, field: 'mother_tongue' },
    citizenship: { type: DataTypes.STRING(100), allowNull: true, defaultValue: 'Indian' },
    aboutMe: { type: DataTypes.TEXT, allowNull: true, field: 'about_me' },
    profilePictureUrl: { type: DataTypes.TEXT, allowNull: true, field: 'profile_picture_url' },
  },
  { tableName: 'personal_details', timestamps: true, underscored: true }
);

module.exports = PersonalDetails;
