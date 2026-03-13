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
 * Calculate match score between current user and a candidate
 * Total: 100 points
 *   Religion    : 25 pts
 *   Age range   : 20 pts
 *   Location    : 15 pts
 *   Education   : 15 pts
 *   Caste       : 15 pts
 *   Employment  : 10 pts
 */
const calculateMatchScore = (currentUser, candidate) => {
  let score = 0;
  const breakdown = {};

  const cu = currentUser;
  const ca = candidate;

  // ---- Religion (25 pts) ----
  const cuReligion = cu.communityDetails?.religion;
  const caReligion = ca.communityDetails?.religion;
  if (cuReligion && caReligion && cuReligion === caReligion) {
    score += 25;
    breakdown.religion = 25;
  } else {
    breakdown.religion = 0;
  }

  // ---- Age (20 pts) ----
  // Ideal: within 5 years for male->female, within 3 years for female->male
  const cuAge = cu.dateOfBirth ? calculateAge(cu.dateOfBirth) : null;
  const caAge = ca.age;
  if (cuAge && caAge) {
    const diff = Math.abs(cuAge - caAge);
    if (diff <= 2)       { score += 20; breakdown.age = 20; }
    else if (diff <= 5)  { score += 15; breakdown.age = 15; }
    else if (diff <= 8)  { score += 10; breakdown.age = 10; }
    else if (diff <= 12) { score += 5;  breakdown.age = 5;  }
    else                 { breakdown.age = 0; }
  } else {
    breakdown.age = 0;
  }

  // ---- Location (15 pts) ----
  const cuCity  = cu.familyDetails?.city?.toLowerCase();
  const caCity  = ca.familyDetails?.city?.toLowerCase();
  const cuState = cu.familyDetails?.state?.toLowerCase();
  const caState = ca.familyDetails?.state?.toLowerCase();
  if (cuCity && caCity && cuCity === caCity) {
    score += 15; breakdown.location = 15;
  } else if (cuState && caState && cuState === caState) {
    score += 8; breakdown.location = 8;
  } else {
    breakdown.location = 0;
  }

  // ---- Education (15 pts) ----
  const eduRank = {
    'phd': 7, 'md': 6, 'mbbs': 6, 'mba': 5, 'm.tech': 5, 'mca': 5,
    'ca': 5, 'llb': 4, 'b.tech': 4, 'be': 4, 'bca': 3, 'b.com': 3,
    'b.sc': 3, 'b.ed': 2, 'diploma': 2, 'others': 1,
  };
  const cuEdu = cu.employmentDetails?.highestEducation?.toLowerCase();
  const caEdu = ca.employmentDetails?.highestEducation?.toLowerCase();
  const cuRank = eduRank[cuEdu] || 3;
  const caRank = eduRank[caEdu] || 3;
  const eduDiff = Math.abs(cuRank - caRank);
  if (eduDiff === 0)      { score += 15; breakdown.education = 15; }
  else if (eduDiff === 1) { score += 10; breakdown.education = 10; }
  else if (eduDiff === 2) { score += 5;  breakdown.education = 5;  }
  else                    { breakdown.education = 0; }

  // ---- Caste (15 pts) ----
  const cuCaste = cu.communityDetails?.caste;
  const caCaste = ca.communityDetails?.caste;
  if (cuCaste && caCaste && cuCaste === caCaste) {
    score += 15; breakdown.caste = 15;
  } else {
    breakdown.caste = 0;
  }

  // ---- Employment (10 pts) ----
  const govtTypes = ['state_government', 'central_government', 'psu', 'banking', 'govt_job'];
  const cuEmpType = cu.employmentDetails?.employmentType;
  const caEmpType = ca.employmentDetails?.employmentType;
  if (cuEmpType && caEmpType) {
    if (cuEmpType === caEmpType) {
      score += 10; breakdown.employment = 10;
    } else if (govtTypes.includes(cuEmpType) && govtTypes.includes(caEmpType)) {
      score += 7; breakdown.employment = 7;
    } else {
      score += 3; breakdown.employment = 3;
    }
  } else {
    breakdown.employment = 0;
  }

  return { score: Math.min(score, 100), breakdown };
};

/**
 * @route   GET /api/v1/search
 * @desc    Search profiles with filters + match score
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
      id: { [Op.ne]: req.user.id },
    };

    if (gender) userWhere.gender = gender;

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

    // Fetch current user's full profile for match scoring
    const currentUserFull = await User.findByPk(req.user.id, {
      include: [
        { association: 'personalDetails' },
        { association: 'familyDetails' },
        { association: 'employmentDetails' },
        { association: 'communityDetails' },
      ],
    });
    const currentUserData = currentUserFull?.toJSON();

    const { count, rows } = await User.findAndCountAll({
      where: userWhere,
      attributes: ['id', 'firstName', 'lastName', 'gender', 'dateOfBirth'],
      include: [
        {
          association: 'personalDetails',
          where: Object.keys(personalDetailsWhere).length ? personalDetailsWhere : undefined,
          required: Object.keys(personalDetailsWhere).length > 0,
          attributes: ['maritalStatus', 'height', 'motherTongue', 'profilePictureUrl'],
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

    // Format results with match score
    const profiles = rows.map((user) => {
      const data = user.toJSON();
      const age = data.dateOfBirth ? calculateAge(data.dateOfBirth) : null;
      const candidateWithAge = { ...data, age };

      // Calculate match score if current user has profile data
      const { score, breakdown } = currentUserData
        ? calculateMatchScore(currentUserData, candidateWithAge)
        : { score: 0, breakdown: {} };

      return {
        ...data,
        age,
        dateOfBirth: undefined,
        matchScore: score,
        matchBreakdown: breakdown,
      };
    });

    // Sort by match score descending
    profiles.sort((a, b) => b.matchScore - a.matchScore);

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
 * @route   GET /api/v1/search/filters
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
