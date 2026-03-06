const { Resend } = require('resend');
const logger = require('../config/logger');
const resend = new Resend(process.env.RESEND_API_KEY);
const sendOTPEmail = async (email, otp, purpose = 'verification') => {
  try {
    const purposeText = purpose === 'login' ? 'Sign In' : 'Email Verification';
    await resend.emails.send({
      from: 'MatrimonyPlatform <onboarding@resend.dev>',
      to: email,
      subject: purposeText + ' OTP - MatrimonyPlatform',
      html: '<div style="font-family:Arial;padding:40px;text-align:center"><h1>MatrimonyPlatform</h1><h2>Your OTP: ' + otp + '</h2><p>Valid for 10 minutes</p></div>',
    });
    logger.info('OTP email sent to ' + email);
    return true;
  } catch (error) {
    logger.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};
const sendWelcomeEmail = async (email, firstName) => {
  try {
    await resend.emails.send({
      from: 'MatrimonyPlatform <onboarding@resend.dev>',
      to: email,
      subject: 'Welcome to MatrimonyPlatform!',
      html: '<div style="font-family:Arial;padding:40px"><h1>Welcome ' + firstName + '!</h1><p>Complete your profile to get started.</p></div>',
    });
    logger.info('Welcome email sent to ' + email);
  } catch (error) {
    logger.error('Error sending welcome email:', error);
  }
};
const sendAccountStatusEmail = async (email, firstName, status, reason) => {
  try {
    await resend.emails.send({
      from: 'MatrimonyPlatform <onboarding@resend.dev>',
      to: email,
      subject: 'Account Update - MatrimonyPlatform',
      html: '<div style="font-family:Arial;padding:40px"><h2>Hi ' + firstName + ',</h2><p>Your account status: ' + status + '</p></div>',
    });
  } catch (error) {
    logger.error('Error sending status email:', error);
  }
};
module.exports = { sendOTPEmail, sendWelcomeEmail, sendAccountStatusEmail };