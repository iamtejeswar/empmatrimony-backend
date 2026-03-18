// src/controllers/interestController.js
const { Interest, User, PersonalDetails, FamilyDetails, EmploymentDetails, CommunityDetails } = require('../models');
const { AppError } = require('../utils/AppError');
const { sendToUser } = require('../config/firebase');

// Profile include helper
const profileInclude = [
  { model: PersonalDetails, as: 'personalDetails', attributes: ['profile_picture_url', 'about_me', 'height', 'marital_status'] },
  { model: FamilyDetails, as: 'familyDetails', attributes: ['city', 'state'] },
  { model: EmploymentDetails, as: 'employmentDetails', attributes: ['job_role', 'highest_education'] },
];

// POST /interests/send/:receiverId
exports.sendInterest = async (req, res, next) => {
  try {
    const { receiverId } = req.params;
    const { message } = req.body;
    const senderId = req.user.id;

    if (senderId === receiverId) {
      return next(new AppError('You cannot send interest to yourself', 400));
    }

    const receiver = await User.findByPk(receiverId);
    if (!receiver) return next(new AppError('User not found', 404));

    const existing = await Interest.findOne({ where: { sender_id: senderId, receiver_id: receiverId } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Interest already ${existing.status}` });
    }

    const interest = await Interest.create({
      sender_id: senderId,
      receiver_id: receiverId,
      status: 'pending',
      message: message || null,
    });

    // FCM push to receiver
    sendToUser(receiverId, {
      title: '💌 New Interest Received',
      body: `${req.user.firstName} ${req.user.lastName[0]}. has sent you an interest!`,
      data: { url: `/interests`, type: 'new_interest' },
    }).catch(() => {});

    res.status(201).json({ success: true, message: 'Interest sent successfully!', data: interest });
  } catch (err) {
    next(err);
  }
};

// PATCH /interests/:interestId/respond
exports.respondInterest = async (req, res, next) => {
  try {
    const { interestId } = req.params;
    const { action } = req.body; // 'accepted' or 'rejected'
    const userId = req.user.id;

    if (!['accepted', 'rejected'].includes(action)) {
      return next(new AppError('Action must be accepted or rejected', 400));
    }

    const interest = await Interest.findByPk(interestId);
    if (!interest) return next(new AppError('Interest not found', 404));
    if (interest.receiver_id !== userId) return next(new AppError('Not authorized', 403));
    if (interest.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Interest already ${interest.status}` });
    }

    interest.status = action;
    await interest.save();

    // FCM push to sender only if accepted
    if (action === 'accepted') {
      sendToUser(interest.sender_id, {
        title: '🎉 Interest Accepted!',
        body: `${req.user.firstName} ${req.user.lastName[0]}. accepted your interest!`,
        data: { url: `/profile/${userId}`, type: 'interest_accepted' },
      }).catch(() => {});
    }

    res.json({ success: true, message: `Interest ${action}!`, data: interest });
  } catch (err) {
    next(err);
  }
};

// GET /interests/received
exports.getReceivedInterests = async (req, res, next) => {
  try {
    const { status = 'pending', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const where = { receiver_id: req.user.id };
    if (status !== 'all') where.status = status;

    const { count, rows } = await Interest.findAndCountAll({
      where,
      include: [{ model: User, as: 'sender', attributes: ['id', 'first_name', 'last_name', 'gender', 'date_of_birth'], include: profileInclude }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({ success: true, data: rows, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) });
  } catch (err) {
    next(err);
  }
};

// GET /interests/sent
exports.getSentInterests = async (req, res, next) => {
  try {
    const { status = 'all', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const where = { sender_id: req.user.id };
    if (status !== 'all') where.status = status;

    const { count, rows } = await Interest.findAndCountAll({
      where,
      include: [{ model: User, as: 'receiver', attributes: ['id', 'first_name', 'last_name', 'gender', 'date_of_birth'], include: profileInclude }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({ success: true, data: rows, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) });
  } catch (err) {
    next(err);
  }
};

// GET /interests/status/:profileId
exports.getInterestStatus = async (req, res, next) => {
  try {
    const { profileId } = req.params;
    const userId = req.user.id;

    const sent = await Interest.findOne({ where: { sender_id: userId, receiver_id: profileId } });
    const received = await Interest.findOne({ where: { sender_id: profileId, receiver_id: userId } });

    res.json({
      success: true,
      data: {
        sent: sent ? { id: sent.id, status: sent.status } : null,
        received: received ? { id: received.id, status: received.status } : null,
      },
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /interests/:interestId
exports.withdrawInterest = async (req, res, next) => {
  try {
    const { interestId } = req.params;
    const interest = await Interest.findByPk(interestId);
    if (!interest) return next(new AppError('Interest not found', 404));
    if (interest.sender_id !== req.user.id) return next(new AppError('Not authorized', 403));
    if (interest.status !== 'pending') return next(new AppError('Can only withdraw pending interests', 400));

    await interest.destroy();
    res.json({ success: true, message: 'Interest withdrawn' });
  } catch (err) {
    next(err);
  }
};
