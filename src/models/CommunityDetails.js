// src/models/CommunityDetails.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CommunityDetails = sequelize.define(
  'CommunityDetails',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true, field: 'user_id' },
    religion: {
      type: DataTypes.ENUM('hindu', 'muslim', 'christian', 'sikh', 'jain', 'buddhist', 'others'),
      allowNull: true,
    },
    caste: {
      type: DataTypes.ENUM('oc', 'bc', 'mbc', 'sc', 'st', 'others'),
      allowNull: true,
    },
    subCaste: { type: DataTypes.STRING(150), allowNull: true, field: 'sub_caste' },
    gothram: { type: DataTypes.STRING(100), allowNull: true },
    physicallychallenged: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'physically_challenged' },
    physicalChallengeDetails: { type: DataTypes.TEXT, allowNull: true, field: 'physical_challenge_details' },
    raasi: { type: DataTypes.STRING(50), allowNull: true },
    star: { type: DataTypes.STRING(50), allowNull: true },
    dhosham: {
      type: DataTypes.ENUM('yes', 'no', 'partial', 'chevvai_dosham', 'rahu_dosham', 'others'),
      allowNull: true,
    },
    birthTime: { type: DataTypes.TIME, allowNull: true, field: 'birth_time' },
    birthPlace: { type: DataTypes.STRING(150), allowNull: true, field: 'birth_place' },
    preferredCommunity: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'preferred_community' },
    preferredReligion: { type: DataTypes.STRING(100), allowNull: true, field: 'preferred_religion' },
    preferredCaste: { type: DataTypes.STRING(200), allowNull: true, field: 'preferred_caste' },
  },
  { tableName: 'community_details', timestamps: true, underscored: true }
);

module.exports = CommunityDetails;
