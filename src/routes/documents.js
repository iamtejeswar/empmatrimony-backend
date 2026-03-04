// src/routes/documents.js
const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../utils/AppError');
const { Document } = require('../models');
const logger = require('../config/logger');

// Multer config - memory storage (for S3 upload)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only JPEG, PNG, and PDF files are allowed', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const VALID_DOC_TYPES = [
  'profile_picture', 'aadhaar', 'pan', 'driving_license',
  'employee_id', 'payslip', 'passport',
];

/**
 * @route   POST /api/v1/documents/upload
 * @desc    Upload a document
 * @access  Private
 */
router.post('/upload', authenticate, upload.single('document'), async (req, res, next) => {
  try {
    if (!req.file) return next(new AppError('No file uploaded', 400));

    const { documentType } = req.body;
    if (!VALID_DOC_TYPES.includes(documentType)) {
      return next(new AppError('Invalid document type', 400));
    }

    // In production: upload to S3
    // For demo: save metadata with a mock S3 key
    const s3Key = `users/${req.user.id}/${documentType}/${Date.now()}_${req.file.originalname}`;

    // Save document record
    const document = await Document.create({
      userId: req.user.id,
      documentType,
      originalName: req.file.originalname,
      s3Key,
      s3Bucket: process.env.AWS_S3_BUCKET || 'matrimony-documents',
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      isEncrypted: true,
      verificationStatus: 'pending',
    });

    logger.info(`Document uploaded: ${documentType} for user ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        document: {
          id: document.id,
          documentType: document.documentType,
          verificationStatus: document.verificationStatus,
          createdAt: document.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/documents
 * @desc    Get user's documents (metadata only, no URLs)
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const documents = await Document.findAll({
      where: { userId: req.user.id },
      attributes: ['id', 'documentType', 'originalName', 'verificationStatus', 'createdAt'],
    });
    res.json({ success: true, data: { documents } });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/documents/:id
 * @desc    Delete a document
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const doc = await Document.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!doc) return next(new AppError('Document not found', 404));
    await doc.destroy();
    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
