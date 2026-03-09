const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('../models');
const logger = require('./logger');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BACKEND_URL}/api/v1/auth/google/callback`,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    const firstName = profile.name.givenName;
    const lastName = profile.name.familyName;

    let user = await User.findOne({ where: { email } });

    if (!user) {
      user = await User.create({
        email,
        firstName,
        lastName,
        googleId: profile.id,
        isEmailVerified: true,
        accountStatus: 'active',
        adminApproved: true,
      });
      logger.info(`New Google user registered: ${email}`);
    } else if (!user.googleId) {
      await user.update({ googleId: profile.id, isEmailVerified: true });
    }

    return done(null, user);
  } catch (error) {
    logger.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;