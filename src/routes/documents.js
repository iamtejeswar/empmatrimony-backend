const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { uploadProfilePicture, uploadDocument, cloudinary } = require('../config/cloudinary');
const { Document } = require('../models');
const logger = require('../config/logger');

// Upload profile picture
router.post('/profile-picture', authenticate, uploadProfilePicture.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const oldDoc = await Document.findOne({
      where: { userId: req.user.id, documentType: 'profile_picture' }
    });
    if (oldDoc && oldDoc.s3Key) {
      await cloudinary.uploader.destroy(oldDoc.s3Key);
      await oldDoc.destroy();
    }

    const document = await Document.create({
      userId: req.user.id,
      documentType: 'profile_picture',
      originalName: req.file.originalname,
      s3Key: req.file.filename,
      s3Bucket: 'cloudinary',
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      verificationStatus: 'verified',
    });

    res.json({
      success: true,
      message: 'Profile picture uploaded',
      data: { url: req.file.path, documentId: document.id }
    });
  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// Upload document
router.post('/upload', authenticate, uploadDocument.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { documentType } = req.body;

    const document = await Document.create({
      userId: req.user.id,
      documentType: documentType || 'other',
      originalName: req.file.originalname,
      s3Key: req.file.filename,
      s3Bucket: 'cloudinary',
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
    });

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: { url: req.file.path, documentId: document.id, document }
    });
  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// Get my documents
router.get('/', authenticate, async (req, res) => {
  try {
    const documents = await Document.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: { documents } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete document
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const document = await Document.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

    await cloudinary.uploader.destroy(document.s3Key);
    await document.destroy();

    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
