// src/models/Interest.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Interest = sequelize.define('Interest', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sender_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    receiver_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
      defaultValue: 'pending',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'interests',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Interest;
};
