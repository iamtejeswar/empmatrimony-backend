// src/services/emailService.js
const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: {
      user: 'resend',
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

/**
 * Send OTP email for verification
 */
const sendOTPEmail = async (email, otp, purpose = 'verification') => {
  try {
    const transporter = createTransporter();
    const purposeText = purpose === 'login' ? 'Sign In' : 'Email Verification';

    await transporter.sendMail({
      from: 'MatrimonyPlatform <onboarding@resend.dev>',
      to: email,
      subject: `${purposeText} OTP - MatrimonyPlatform`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #c8962d 0%, #f0c050 100%); padding: 40px 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .body { padding: 40px 30px; text-align: center; }
            .otp-box { background: #fef9ec; border: 2px dashed #c8962d; border-radius: 12px; padding: 20px; margin: 30px 0; }
            .otp-code { font-size: 48px; font-weight: bold; color: #c8962d; letter-spacing: 12px; }
            .expires { color: #888; font-size: 14px; }
            .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💍 MatrimonyPlatform</h1>
            </div>
            <div class="body">
              <h2>${purposeText} OTP</h2>
              <p>Use the following OTP to complete your ${purposeText.toLowerCase()}:</p>
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>
              <p class="expires">⏰ This OTP is valid for <strong>${process.env.OTP_EXPIRES_MINUTES || 10} minutes</strong></p>
              <p>If you didn't request this OTP, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} MatrimonyPlatform. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    logger.info(`OTP email sent to ${email}`);
    return true;
  } catch (error) {
    logger.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

/**
 * Send welcome email after registration
 */
const sendWelcomeEmail = async (email, firstName, lastName) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: 'MatrimonyPlatform <onboarding@resend.dev>',
      to: email,
      subject: `Welcome to MatrimonyPlatform, ${firstName}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #1a237e 0%, #c8962d 100%); padding: 40px 30px; text-align: center; }
            .header h1 { color: white; margin: 0; }
            .body { padding: 40px 30px; }
            .btn { display: inline-block; background: #c8962d; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>💍 Welcome to MatrimonyPlatform!</h1></div>
            <div class="body">
              <h2>Welcome, ${firstName} ${lastName}! 🎉</h2>
              <p>We're thrilled to have you join our community. Your journey to finding the perfect life partner starts here.</p>
              <p>Complete your profile to get started:</p>
              <ul>
                <li>✅ Add personal details</li>
                <li>✅ Upload your photo</li>
                <li>✅ Share family background</li>
                <li>✅ Complete horoscope details</li>
              </ul>
              <p>The more complete your profile, the better your chances of finding the right match!</p>
              <a href="${process.env.FRONTEND_URL}/profile/complete" class="btn">Complete My Profile</a>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    logger.info(`Welcome email sent to ${email}`);
  } catch (error) {
    logger.error('Error sending welcome email:', error);
    // Non-critical - don't throw
  }
};

/**
 * Send account status update notification
 */
const sendAccountStatusEmail = async (email, firstName, status, reason = '') => {
  try {
    const transporter = createTransporter();
    const statusMessages = {
      active: { subject: 'Account Approved!', body: 'Your account has been approved. You can now access all features.' },
      suspended: { subject: 'Account Suspended', body: `Your account has been temporarily suspended. Reason: ${reason}` },
      blocked: { subject: 'Account Blocked', body: `Your account has been blocked. Reason: ${reason}. Contact support for assistance.` },
    };
    const { subject, body } = statusMessages[status] || { subject: 'Account Update', body: 'Your account status has been updated.' };

    await transporter.sendMail({
      from: 'MatrimonyPlatform <onboarding@resend.dev>',
      to: email,
      subject: `${subject} - MatrimonyPlatform`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 40px; background: #fff; border-radius: 12px;">
        <h2>Hi ${firstName},</h2>
        <p>${body}</p>
        <p>If you have questions, contact us at support@matrimony.com</p>
        <p>— The MatrimonyPlatform Team</p>
      </div>`,
    });
  } catch (error) {
    logger.error('Error sending status email:', error);
  }
};

module.exports = { sendOTPEmail, sendWelcomeEmail, sendAccountStatusEmail };
