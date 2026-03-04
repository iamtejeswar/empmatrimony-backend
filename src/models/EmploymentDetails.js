// src/models/EmploymentDetails.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EmploymentDetails = sequelize.define(
  'EmploymentDetails',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true, field: 'user_id' },
    highestEducation: { type: DataTypes.STRING(150), allowNull: true, field: 'highest_education' },
    educationDetails: { type: DataTypes.TEXT, allowNull: true, field: 'education_details' },
    employmentType: {
      type: DataTypes.ENUM(
        'state_government', 'central_government', 'psu',
        'banking', 'private', 'self_employed', 'others', 'unemployed'
      ),
      allowNull: true,
      field: 'employment_type',
    },
    departmentCompanyName: { type: DataTypes.STRING(200), allowNull: true, field: 'department_company_name' },
    jobRole: { type: DataTypes.STRING(150), allowNull: true, field: 'job_role' },
    monthlySalary: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: 'monthly_salary' },
    annualIncome: { type: DataTypes.DECIMAL(14, 2), allowNull: true, field: 'annual_income' },
    workingSince: { type: DataTypes.DATEONLY, allowNull: true, field: 'working_since' },
    officeAddress: { type: DataTypes.TEXT, allowNull: true, field: 'office_address' },
    officeCity: { type: DataTypes.STRING(100), allowNull: true, field: 'office_city' },
    officeState: { type: DataTypes.STRING(100), allowNull: true, field: 'office_state' },
  },
  { tableName: 'employment_details', timestamps: true, underscored: true }
);

module.exports = EmploymentDetails;
