// src/models/Document.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Document = sequelize.define(
  'Document',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    documentType: {
      type: DataTypes.ENUM(
        'profile_picture', 'aadhaar', 'pan', 'driving_license',
        'employee_id', 'payslip', 'passport', 'other'
      ),
      allowNull: false,
      field: 'document_type',
    },
    originalName: { type: DataTypes.STRING(255), allowNull: false, field: 'original_name' },
    s3Key: { type: DataTypes.TEXT, allowNull: false, field: 's3_key' },
    s3Bucket: { type: DataTypes.STRING(255), allowNull: false, field: 's3_bucket' },
    mimeType: { type: DataTypes.STRING(100), allowNull: true, field: 'mime_type' },
    fileSize: { type: DataTypes.BIGINT, allowNull: true, field: 'file_size' },
    isEncrypted: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_encrypted' },
    verificationStatus: {
      type: DataTypes.ENUM('pending', 'verified', 'rejected'),
      defaultValue: 'pending',
      field: 'verification_status',
    },
    verifiedBy: { type: DataTypes.UUID, allowNull: true, field: 'verified_by' },
    verifiedAt: { type: DataTypes.DATE, allowNull: true, field: 'verified_at' },
    rejectionReason: { type: DataTypes.TEXT, allowNull: true, field: 'rejection_reason' },
  },
  { tableName: 'documents', timestamps: true, underscored: true }
);

module.exports = Document;
