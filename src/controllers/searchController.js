// src/controllers/searchController.js
const { Op } = require('sequelize');
const { User, PersonalDetails, FamilyDetails, EmploymentDetails, CommunityDetails } = require('../models');
const { AppError } = require('../utils/AppError');

/**
 * Calculate age from date of birth
 */
const calculateAge = (dob) => {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

/**
 * @route   GET /api/v1/search
 * @desc    Search profiles with filters
 * @access  Private
 */
const searchProfiles = async (req, res, next) => {
  try {
    const {
      gender, minAge, maxAge, religion, caste, subCaste, maritalStatus,
      employmentType, minSalary, maxSalary, city, state,
      page = 1, limit = 12,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build user WHERE clause
    const userWhere = {
      accountStatus: 'active',
      isProfileComplete: true,
      id: { [Op.ne]: req.user.id }, // Exclude self
    };

    if (gender) userWhere.gender = gender;

    // Age filter: convert to birth date range
    if (minAge || maxAge) {
      const today = new Date();
      const birthDateWhere = {};
      if (maxAge) {
        const minBirth = new Date(today);
        minBirth.setFullYear(minBirth.getFullYear() - parseInt(maxAge));
        birthDateWhere[Op.gte] = minBirth;
      }
      if (minAge) {
        const maxBirth = new Date(today);
        maxBirth.setFullYear(maxBirth.getFullYear() - parseInt(minAge));
        birthDateWhere[Op.lte] = maxBirth;
      }
      userWhere.dateOfBirth = birthDateWhere;
    }

    // Build include conditions
    const personalDetailsWhere = {};
    if (maritalStatus) personalDetailsWhere.maritalStatus = maritalStatus;

    const employmentWhere = {};
    if (employmentType) employmentWhere.employmentType = employmentType;
    if (minSalary || maxSalary) {
      employmentWhere.monthlySalary = {};
      if (minSalary) employmentWhere.monthlySalary[Op.gte] = parseFloat(minSalary);
      if (maxSalary) employmentWhere.monthlySalary[Op.lte] = parseFloat(maxSalary);
    }

    const communityWhere = {};
    if (religion) communityWhere.religion = religion;
    if (caste) communityWhere.caste = caste;
    if (subCaste) communityWhere.subCaste = { [Op.iLike]: `%${subCaste}%` };

    const familyWhere = {};
    if (city) familyWhere.city = { [Op.iLike]: `%${city}%` };
    if (state) familyWhere.state = { [Op.iLike]: `%${state}%` };

    const { count, rows } = await User.findAndCountAll({
      where: userWhere,
      attributes: ['id', 'firstName', 'lastName', 'gender', 'dateOfBirth'],
      include: [
        {
          association: 'personalDetails',
          where: Object.keys(personalDetailsWhere).length ? personalDetailsWhere : undefined,
          required: Object.keys(personalDetailsWhere).length > 0,
          attributes: ['maritalStatus', 'height', 'motherTongue'],
        },
        {
          association: 'familyDetails',
          where: Object.keys(familyWhere).length ? familyWhere : undefined,
          required: Object.keys(familyWhere).length > 0,
          attributes: ['city', 'state', 'country'],
        },
        {
          association: 'employmentDetails',
          where: Object.keys(employmentWhere).length ? employmentWhere : undefined,
          required: Object.keys(employmentWhere).length > 0,
          attributes: ['highestEducation', 'employmentType', 'jobRole'],
        },
        {
          association: 'communityDetails',
          where: Object.keys(communityWhere).length ? communityWhere : undefined,
          required: Object.keys(communityWhere).length > 0,
          attributes: ['religion', 'caste', 'subCaste', 'raasi'],
        },
      ],
      limit: parseInt(limit),
      offset,
      distinct: true,
    });

    // Format results - mask photo
    const profiles = rows.map((user) => {
      const data = user.toJSON();
      return {
        ...data,
        age: data.dateOfBirth ? calculateAge(data.dateOfBirth) : null,
        dateOfBirth: undefined, // Exclude exact DOB
        profilePicture: { masked: true },
        // Contact info is always masked
      };
    });

    res.json({
      success: true,
      data: {
        profiles,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/search/suggestions
 * @desc    Get search filter suggestions (religions, castes, etc.)
 */
const getFilterOptions = async (req, res) => {
  res.json({
    success: true,
    data: {
      religions: ['hindu', 'muslim', 'christian', 'sikh', 'jain', 'buddhist', 'others'],
      castes: ['oc', 'bc', 'mbc', 'sc', 'st', 'others'],
      maritalStatuses: ['never_married', 'divorced', 'widowed', 'awaiting_divorce'],
      employmentTypes: [
        'state_government', 'central_government', 'psu', 'banking',
        'private', 'self_employed', 'others',
      ],
      raasis: [
        'Mesham', 'Rishabam', 'Mithunam', 'Kadagam', 'Simmam', 'Kanni',
        'Thulam', 'Viruchigam', 'Dhanusu', 'Magaram', 'Kumbam', 'Meenam',
      ],
      stars: [
        'Ashwini', 'Bharani', 'Krithigai', 'Rohini', 'Mirugasirisham', 'Thiruvathirai',
        'Punarpoosam', 'Poosam', 'Ayilyam', 'Magam', 'Pooram', 'Uthiram',
        'Hastham', 'Chithirai', 'Swathi', 'Vishakam', 'Anusham', 'Kettai',
        'Moolam', 'Pooradam', 'Uthiradam', 'Thiruvonam', 'Avittam', 'Sadhayam',
        'Poorattathi', 'Uthirattathi', 'Revathi',
      ],
    },
  });
};

module.exports = { searchProfiles, getFilterOptions };
