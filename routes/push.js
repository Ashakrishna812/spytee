require('dotenv').config();
const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const SiteSettings = require('../models/SiteSettings');

// Ensure VAPID keys exist
async function ensureVapidKeys() {
  let settings = await SiteSettings.findOne();
  if (!settings) settings = await SiteSettings.create({});

  if (!settings.vapidPublicKey || !settings.vapidPrivateKey) {
    const vapidKeys = webpush.generateVAPIDKeys();
    settings.vapidPublicKey = vapidKeys.publicKey;
    settings.vapidPrivateKey = vapidKeys.privateKey;
    await settings.save();
  }
  return settings;
}

// GET /api/push/vapid-public-key
router.get('/vapid-public-key', async (req, res) => {
  try {
    const settings = await ensureVapidKeys();
    res.json({ publicKey: settings.vapidPublicKey });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/push/subscribe
router.post('/subscribe', async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ message: 'Invalid subscription data' });
    }

    const existing = await PushSubscription.findOne({ where: { endpoint } });
    if (existing) {
      existing.keys = keys;
      existing.userAgent = req.get('user-agent') || '';
      await existing.save();
      return res.json({ message: 'Subscription updated', subscriptionId: existing.id });
    }

    const subscription = await PushSubscription.create({
      endpoint,
      keys,
      ipAddress: req.ip || req.connection.remoteAddress || '',
      userAgent: req.get('user-agent') || '',
    });

    res.status(201).json({ message: 'Subscribed', subscriptionId: subscription.id });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError' || err.parent?.code === 'ER_DUP_ENTRY') {
      return res.json({ message: 'Already subscribed' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/push/unsubscribe
router.delete('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ message: 'Endpoint required' });

    await PushSubscription.destroy({ where: { endpoint } });
    res.json({ message: 'Unsubscribed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/push/test — send a test push to the current session
router.post('/test', async (req, res) => {
  try {
    const settings = await ensureVapidKeys();
    const { subscription, title, body } = req.body;

    if (!subscription || !title || !body) {
      return res.status(400).json({ message: 'subscription, title, and body are required' });
    }

    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL || 'admin@spycon.com'}`,
      settings.vapidPublicKey,
      settings.vapidPrivateKey
    );

    await webpush.sendNotification(subscription, JSON.stringify({ title, body, icon: '/favicon.ico' }));
    res.json({ message: 'Test notification sent' });
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      return res.status(410).json({ message: 'Subscription expired or invalid', error: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
