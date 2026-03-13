// src/controllers/profileController.js
const { User, PersonalDetails, FamilyDetails, EmploymentDetails, CommunityDetails, Document } = require('../models');
const { AppError } = require('../utils/AppError');
const logger = require('../config/logger');
const { sequelize } = require('../config/database');

const getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'otpSecret', 'refreshToken', 'googleId'] },
      include: [
        { association: 'personalDetails' },
        { association: 'familyDetails' },
        { association: 'employmentDetails' },
        { association: 'communityDetails' },
        {
          association: 'documents',
          where: { documentType: 'profile_picture' },
          required: false,
          attributes: ['id', 'documentType', 'verificationStatus', 'createdAt'],
        },
      ],
    });
    res.json({ success: true, data: { profile: user } });
  } catch (error) {
    next(error);
  }
};

const savePersonalDetails = async (req, res, next) => {
  try {
    const { maritalStatus, height, weight, motherTongue, citizenship, aboutMe } = req.body;
    const data = { userId: req.user.id, maritalStatus, height, weight, motherTongue, citizenship, aboutMe };

    let details = await PersonalDetails.findOne({ where: { userId: req.user.id } });
    if (details) {
      await details.update(data);
    } else {
      details = await PersonalDetails.create(data);
    }

    if (req.user.profileCompletionStep < 1) {
      await req.user.update({ profileCompletionStep: 1 });
    }
    res.json({ success: true, message: 'Personal details saved', data: { personalDetails: details } });
  } catch (error) {
    next(error);
  }
};

const saveFamilyDetails = async (req, res, next) => {
  try {
    const {
      fatherName, fatherOccupation, motherName, motherOccupation,
      familyContactNumber, numberOfBrothers, numberOfSisters,
      permanentAddress, city, state, country, pincode, familyType, familyStatus,
    } = req.body;
    const data = {
      userId: req.user.id, fatherName, fatherOccupation, motherName, motherOccupation,
      familyContactNumber, numberOfBrothers, numberOfSisters,
      permanentAddress, city, state, country, pincode, familyType, familyStatus,
    };

    let details = await FamilyDetails.findOne({ where: { userId: req.user.id } });
    if (details) {
      await details.update(data);
    } else {
      details = await FamilyDetails.create(data);
    }

    if (req.user.profileCompletionStep < 2) {
      await req.user.update({ profileCompletionStep: 2 });
    }
    res.json({ success: true, message: 'Family details saved', data: { familyDetails: details } });
  } catch (error) {
    next(error);
  }
};

const saveEmploymentDetails = async (req, res, next) => {
  try {
    const {
      highestEducation, educationDetails, employmentType, departmentCompanyName,
      jobRole, monthlySalary, annualIncome, workingSince, officeAddress, officeCity, officeState,
    } = req.body;
    const data = {
      userId: req.user.id, highestEducation, educationDetails, employmentType,
      departmentCompanyName, jobRole, monthlySalary, annualIncome,
      workingSince, officeAddress, officeCity, officeState,
    };

    let details = await EmploymentDetails.findOne({ where: { userId: req.user.id } });
    if (details) {
      await details.update(data);
    } else {
      details = await EmploymentDetails.create(data);
    }

    if (req.user.profileCompletionStep < 3) {
      await req.user.update({ profileCompletionStep: 3 });
    }
    res.json({ success: true, message: 'Employment details saved', data: { employmentDetails: details } });
  } catch (error) {
    next(error);
  }
};

const saveCommunityDetails = async (req, res, next) => {
  try {
    const {
      religion, caste, subCaste, gothram, physicallychallenged, physicalChallengeDetails,
      raasi, star, dhosham, birthTime, birthPlace, preferredCommunity, preferredReligion, preferredCaste,
    } = req.body;
    const data = {
      userId: req.user.id, religion, caste, subCaste, gothram, physicallychallenged,
      physicalChallengeDetails, raasi, star, dhosham, birthTime, birthPlace,
      preferredCommunity, preferredReligion, preferredCaste,
    };

    let details = await CommunityDetails.findOne({ where: { userId: req.user.id } });
    if (details) {
      await details.update(data);
    } else {
      details = await CommunityDetails.create(data);
    }

    if (req.user.profileCompletionStep < 4) {
      await req.user.update({ profileCompletionStep: 4 });
    }
    res.json({ success: true, message: 'Community details saved', data: { communityDetails: details } });
  } catch (error) {
    next(error);
  }
};

const completeProfile = async (req, res, next) => {
  try {
    await req.user.update({ isProfileComplete: true, profileCompletionStep: 5 });
    res.json({ success: true, message: 'Profile completed successfully! Awaiting admin approval.' });
  } catch (error) {
    next(error);
  }
};

// ---- Record view silently (upsert — one row per viewer+viewed pair) ----
const recordProfileView = async (viewerId, viewedId) => {
  await sequelize.query(`
    INSERT INTO profile_views (id, viewer_id, viewed_id, viewed_at)
    VALUES (uuid_generate_v4(), :viewerId, :viewedId, NOW())
    ON CONFLICT (viewer_id, viewed_id)
    DO UPDATE SET viewed_at = NOW()
  `, { replacements: { viewerId, viewedId } });
};

const getPublicProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'gender', 'dateOfBirth', 'accountStatus'],
      include: [
        { association: 'personalDetails', attributes: ['maritalStatus', 'height', 'weight', 'motherTongue', 'citizenship', 'aboutMe', 'profilePictureUrl'] },
        { association: 'familyDetails', attributes: ['city', 'state', 'country', 'familyType', 'familyStatus'] },
        { association: 'employmentDetails', attributes: ['highestEducation', 'employmentType', 'jobRole'] },
        { association: 'communityDetails', attributes: ['religion', 'caste', 'subCaste', 'raasi', 'star'] },
      ],
    });

    if (!user || user.accountStatus !== 'active') {
      return next(new AppError('Profile not found', 404));
    }

    // Record view — fire & forget, never block the response
    if (req.user && req.user.id !== userId) {
      recordProfileView(req.user.id, userId).catch(err =>
        logger.error('Failed to record profile view:', err)
      );
    }

    const profileData = user.toJSON();
    profileData.profilePicture = { masked: true, message: 'Upgrade to view photos' };
    res.json({ success: true, data: { profile: profileData } });
  } catch (error) {
    next(error);
  }
};

// ---- GET /api/v1/profile/viewers ----
const getProfileViewers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [viewers] = await sequelize.query(`
      SELECT
        pv.viewed_at,
        u.id,
        u.first_name,
        u.last_name,
        u.gender,
        pd.profile_picture_url,
        pd.about_me,
        fd.city,
        fd.state,
        ed.job_role,
        ed.employment_type
      FROM profile_views pv
      JOIN users u ON u.id = pv.viewer_id
      LEFT JOIN personal_details pd ON pd.user_id = u.id
      LEFT JOIN family_details fd ON fd.user_id = u.id
      LEFT JOIN employment_details ed ON ed.user_id = u.id
      WHERE pv.viewed_id = :userId
        AND u.account_status = 'active'
      ORDER BY pv.viewed_at DESC
      LIMIT :limit OFFSET :offset
    `, { replacements: { userId: req.user.id, limit: parseInt(limit), offset } });

    const [[{ total }]] = await sequelize.query(`
      SELECT COUNT(*) AS total
      FROM profile_views pv
      JOIN users u ON u.id = pv.viewer_id
      WHERE pv.viewed_id = :userId AND u.account_status = 'active'
    `, { replacements: { userId: req.user.id } });

    res.json({
      success: true,
      data: {
        viewers,
        pagination: {
          total: parseInt(total),
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(parseInt(total) / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  savePersonalDetails,
  saveFamilyDetails,
  saveEmploymentDetails,
  saveCommunityDetails,
  completeProfile,
  getPublicProfile,
  getProfileViewers,
};
