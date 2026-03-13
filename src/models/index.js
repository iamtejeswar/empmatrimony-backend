// src/models/index.js
const { sequelize } = require('../config/database');

const User = require('./User');
const PersonalDetails = require('./PersonalDetails');
const FamilyDetails = require('./FamilyDetails');
const EmploymentDetails = require('./EmploymentDetails');
const CommunityDetails = require('./CommunityDetails');
const Document = require('./Document');
const Interest = require('./Interest')(sequelize);

// ---- Associations ----
User.hasOne(PersonalDetails, { foreignKey: 'user_id', as: 'personalDetails', onDelete: 'CASCADE' });
PersonalDetails.belongsTo(User, { foreignKey: 'user_id' });

User.hasOne(FamilyDetails, { foreignKey: 'user_id', as: 'familyDetails', onDelete: 'CASCADE' });
FamilyDetails.belongsTo(User, { foreignKey: 'user_id' });

User.hasOne(EmploymentDetails, { foreignKey: 'user_id', as: 'employmentDetails', onDelete: 'CASCADE' });
EmploymentDetails.belongsTo(User, { foreignKey: 'user_id' });

User.hasOne(CommunityDetails, { foreignKey: 'user_id', as: 'communityDetails', onDelete: 'CASCADE' });
CommunityDetails.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Document, { foreignKey: 'user_id', as: 'documents', onDelete: 'CASCADE' });
Document.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Interest, { foreignKey: 'sender_id', as: 'sentInterests', onDelete: 'CASCADE' });
User.hasMany(Interest, { foreignKey: 'receiver_id', as: 'receivedInterests', onDelete: 'CASCADE' });
Interest.belongsTo(User, { as: 'sender', foreignKey: 'sender_id' });
Interest.belongsTo(User, { as: 'receiver', foreignKey: 'receiver_id' });

module.exports = {
  User,
  PersonalDetails,
  FamilyDetails,
  EmploymentDetails,
  CommunityDetails,
  Document,
  Interest,
};