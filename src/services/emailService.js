const { Resend } = require('resend');
const logger = require('../config/logger');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOTPEmail = async (email, otp, purpose = 'verification') => {
  try {
    const purposeText = purpose === 'login' ? 'Sign In' : 'Email Verification';
    await resend.emails.send({
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
            <div class="header"><h1>💍 MatrimonyPlatform</h1></div>
            <div class="body">
              <h2>${purposeText} OTP</h2>
              <p>Use the following OTP to complete your ${purposeText.toLowerCase()}:</p>
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>
              <p class="expires">⏰ Valid for <strong>${process.env.OTP_EXPIRES_MINUTES || 10} minutes</strong></p>
              <p>If you didn't request this, please ignore.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} MatrimonyPlatform. All rights reserved.</p>
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

const sendWelcomeEmail = async (email, firstName, lastName) => {
  try {
    await resend.emails.send({
      from: 'MatrimonyPlatform <onboarding@resend.dev>',
      to: email,
      subject: `Welcome to MatrimonyPlatform, ${firstName}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 40px; background: #fff; border-radius: 12px;">
          <h1 style="color: #c8962d;">💍 Welcome, ${firstName}!</h1>
          <p>Your journey to finding the perfect life partner starts here.</p>
          <p>Complete your profile to get started!</p>
          <a href="${process.env.FRONTEND_URL}/profile/complete" 
             style="display: inline-block; background: #c8962d; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Complete My Profile
          </a>
        </div>
      `,
    });
    logger.info(`Welcome email sent to ${email}`);
  } catch (error) {
    logger.error('Error sending welcome email:', error);
  }
};

const sendAccountStatusEmail = async (email, firstName, status, reason = '') => {
  try {
    const statusMessages = {
      active: { subject: 'Account Approved!', body: 'Your account has been approved.' },
      suspended: { subject: 'Account Suspended', body: `Your account has been suspended. Reason: ${reason}` },
      blocked: { subject: 'Account Blocked', body: `Your account has been blocked. Reason: ${reason}` },
    };
    const { subject, body } = statusMessages[status] || { subject: 'Account Update', body: 'Your account status has been updated.' };
    await resend.emails.send({
      from: 'MatrimonyPlatform <onboarding@resend.dev>',
      to: email,
      subject: `${subject} - MatrimonyPlatform`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 40px;">
          <h2>Hi ${firstName},</h2>
          <p>${body}</p>
          <p>— The MatrimonyPlatform Team</p>
        </div>
      `,
    });
  } catch (error) {
    logger.error('Error sending status email:', error);
  }
};

module.exports = { sendOTPEmail, sendWelcomeEmail, sendAccountStatusEmail };
```

---

## STEP 3 — Add Resend API Key to Railway

Go to **Railway → Variables** and add:
```
RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxxxxxxxx