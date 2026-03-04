// src/models/FamilyDetails.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FamilyDetails = sequelize.define(
  'FamilyDetails',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true, field: 'user_id' },
    fatherName: { type: DataTypes.STRING(150), allowNull: true, field: 'father_name' },
    fatherOccupation: { type: DataTypes.STRING(150), allowNull: true, field: 'father_occupation' },
    motherName: { type: DataTypes.STRING(150), allowNull: true, field: 'mother_name' },
    motherOccupation: { type: DataTypes.STRING(150), allowNull: true, field: 'mother_occupation' },
    familyContactNumber: { type: DataTypes.STRING(15), allowNull: true, field: 'family_contact_number' },
    numberOfBrothers: { type: DataTypes.INTEGER, defaultValue: 0, field: 'number_of_brothers' },
    numberOfSisters: { type: DataTypes.INTEGER, defaultValue: 0, field: 'number_of_sisters' },
    permanentAddress: { type: DataTypes.TEXT, allowNull: true, field: 'permanent_address' },
    city: { type: DataTypes.STRING(100), allowNull: true },
    state: { type: DataTypes.STRING(100), allowNull: true },
    country: { type: DataTypes.STRING(100), defaultValue: 'India' },
    pincode: { type: DataTypes.STRING(10), allowNull: true },
    familyType: {
      type: DataTypes.ENUM('nuclear', 'joint', 'extended'),
      allowNull: true,
      field: 'family_type',
    },
    familyStatus: {
      type: DataTypes.ENUM('middle_class', 'upper_middle_class', 'rich', 'affluent'),
      allowNull: true,
      field: 'family_status',
    },
  },
  { tableName: 'family_details', timestamps: true, underscored: true }
);

module.exports = FamilyDetails;
