// src/config/firebase.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

/**
 * Send push notification to a single token
 */
const sendNotification = async (token, { title, body, data = {} }) => {
  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      webpush: {
        notification: { title, body, icon: '/logo.png', badge: '/logo.png' },
        fcmOptions: { link: data.url || '/' },
      },
      android: {
        notification: { title, body, sound: 'default' },
        priority: 'high',
      },
    });
  } catch (err) {
    // Token may be expired/invalid — caller handles cleanup
    throw err;
  }
};

/**
 * Send to all tokens of a user
 */
const sendToUser = async (userId, notification) => {
  try {
    const { sequelize } = require('./database');
    const [tokens] = await sequelize.query(
      'SELECT token FROM fcm_tokens WHERE user_id = :userId',
      { replacements: { userId } }
    );
    if (!tokens.length) return;

    const results = await Promise.allSettled(
      tokens.map(({ token }) => sendNotification(token, notification))
    );

    // Remove invalid tokens
    const invalidTokens = tokens
      .filter((_, i) => results[i].status === 'rejected')
      .map(t => t.token);

    if (invalidTokens.length) {
      await sequelize.query(
        'DELETE FROM fcm_tokens WHERE user_id = :userId AND token = ANY(:tokens)',
        { replacements: { userId, tokens: invalidTokens } }
      );
    }
  } catch (err) {
    console.error('sendToUser error:', err);
  }
};

module.exports = { sendNotification, sendToUser };
