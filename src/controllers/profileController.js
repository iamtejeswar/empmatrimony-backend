// src/controllers/profileController.js
const { User, PersonalDetails, FamilyDetails, EmploymentDetails, CommunityDetails, Document } = require('../models');
const { AppError } = require('../utils/AppError');
const logger = require('../config/logger');

/**
 * @route   GET /api/v1/profile
 * @desc    Get complete profile of authenticated user
 */
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

/**
 * @route   PUT /api/v1/profile/step/1
 * @desc    Save personal details (Step 1)
 */
const savePersonalDetails = async (req, res, next) => {
  try {
    const { maritalStatus, height, weight, motherTongue, citizenship, aboutMe } = req.body;

    const [details, created] = await PersonalDetails.upsert(
      { userId: req.user.id, maritalStatus, height, weight, motherTongue, citizenship, aboutMe },
      { returning: true }
    );

    // Update completion step if advancing
    if (req.user.profileCompletionStep < 1) {
      await req.user.update({ profileCompletionStep: 1 });
    }

    res.json({ success: true, message: 'Personal details saved', data: { personalDetails: details } });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/profile/step/2
 * @desc    Save family details (Step 2)
 */
const saveFamilyDetails = async (req, res, next) => {
  try {
    const {
      fatherName, fatherOccupation, motherName, motherOccupation,
      familyContactNumber, numberOfBrothers, numberOfSisters,
      permanentAddress, city, state, country, pincode, familyType, familyStatus,
    } = req.body;

    const [details] = await FamilyDetails.upsert(
      {
        userId: req.user.id, fatherName, fatherOccupation, motherName, motherOccupation,
        familyContactNumber, numberOfBrothers, numberOfSisters,
        permanentAddress, city, state, country, pincode, familyType, familyStatus,
      },
      { returning: true }
    );

    if (req.user.profileCompletionStep < 2) {
      await req.user.update({ profileCompletionStep: 2 });
    }

    res.json({ success: true, message: 'Family details saved', data: { familyDetails: details } });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/profile/step/3
 * @desc    Save employment details (Step 3)
 */
const saveEmploymentDetails = async (req, res, next) => {
  try {
    const {
      highestEducation, educationDetails, employmentType, departmentCompanyName,
      jobRole, monthlySalary, annualIncome, workingSince, officeAddress, officeCity, officeState,
    } = req.body;

    const [details] = await EmploymentDetails.upsert(
      {
        userId: req.user.id, highestEducation, educationDetails, employmentType,
        departmentCompanyName, jobRole, monthlySalary, annualIncome,
        workingSince, officeAddress, officeCity, officeState,
      },
      { returning: true }
    );

    if (req.user.profileCompletionStep < 3) {
      await req.user.update({ profileCompletionStep: 3 });
    }

    res.json({ success: true, message: 'Employment details saved', data: { employmentDetails: details } });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/profile/step/4
 * @desc    Save community and horoscope details (Step 4)
 */
const saveCommunityDetails = async (req, res, next) => {
  try {
    const {
      religion, caste, subCaste, gothram, physicallychallenged, physicalChallengeDetails,
      raasi, star, dhosham, birthTime, birthPlace, preferredCommunity, preferredReligion, preferredCaste,
    } = req.body;

    const [details] = await CommunityDetails.upsert(
      {
        userId: req.user.id, religion, caste, subCaste, gothram, physicallychallenged,
        physicalChallengeDetails, raasi, star, dhosham, birthTime, birthPlace,
        preferredCommunity, preferredReligion, preferredCaste,
      },
      { returning: true }
    );

    if (req.user.profileCompletionStep < 4) {
      await req.user.update({ profileCompletionStep: 4 });
    }

    res.json({ success: true, message: 'Community details saved', data: { communityDetails: details } });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/profile/complete
 * @desc    Mark profile as complete (Step 5 - after document upload)
 */
const completeProfile = async (req, res, next) => {
  try {
    await req.user.update({ isProfileComplete: true, profileCompletionStep: 5 });
    res.json({ success: true, message: 'Profile completed successfully! Awaiting admin approval.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/profile/:userId
 * @desc    Get another user's profile (masked for privacy)
 */
const getPublicProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'gender', 'dateOfBirth', 'accountStatus'],
      include: [
        {
          association: 'personalDetails',
          attributes: ['maritalStatus', 'height', 'weight', 'motherTongue', 'citizenship', 'aboutMe'],
        },
        {
          association: 'familyDetails',
          attributes: ['city', 'state', 'country', 'familyType', 'familyStatus'],
        },
        {
          association: 'employmentDetails',
          attributes: ['highestEducation', 'employmentType', 'jobRole'],
          // Salary excluded for privacy
        },
        {
          association: 'communityDetails',
          attributes: ['religion', 'caste', 'subCaste', 'raasi', 'star'],
        },
      ],
    });

    if (!user || user.accountStatus !== 'active') {
      return next(new AppError('Profile not found', 404));
    }

    // Mask profile picture for non-premium users
    const profileData = user.toJSON();
    profileData.profilePicture = { masked: true, message: 'Upgrade to view photos' };

    res.json({ success: true, data: { profile: profileData } });
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
};
