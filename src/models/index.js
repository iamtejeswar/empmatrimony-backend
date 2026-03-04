// src/models/index.js
const User = require('./User');
const PersonalDetails = require('./PersonalDetails');
const FamilyDetails = require('./FamilyDetails');
const EmploymentDetails = require('./EmploymentDetails');
const CommunityDetails = require('./CommunityDetails');
const Document = require('./Document');

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

module.exports = { User, PersonalDetails, FamilyDetails, EmploymentDetails, CommunityDetails, Document };
