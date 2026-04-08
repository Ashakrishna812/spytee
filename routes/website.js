const express = require('express');
const router = express.Router();
const SiteMenu = require('../models/SiteMenu');
const Notification = require('../models/Notification');
const SiteSettings = require('../models/SiteSettings');
const Page = require('../models/Page');
const Post = require('../models/Post');
const PushSubscription = require('../models/PushSubscription');
const { auth: authMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const webpush = require('web-push');
require('dotenv').config();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ==================== SITE SETTINGS ====================

router.get('/settings', authMiddleware, async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();
    if (!settings) settings = await SiteSettings.create({});
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/settings', authMiddleware, async (req, res) => {
  try {
    const { siteName, homepageId, homepageType, colorTheme, fontSettings, customCSS } = req.body;
    const update = {};
    if (siteName !== undefined) update.siteName = siteName;
    if (homepageId !== undefined) update.homepageId = homepageId;
    if (homepageType !== undefined) update.homepageType = homepageType;
    if (colorTheme !== undefined) update.colorTheme = colorTheme;
    if (fontSettings !== undefined) update.fontSettings = fontSettings;
    if (customCSS !== undefined) update.customCSS = customCSS;

    let settings = await SiteSettings.findOneAndUpdate({}, update, { new: true, upsert: true });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/settings/logo', authMiddleware, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const logoUrl = `/uploads/${req.file.filename}`;
    const settings = await SiteSettings.findOneAndUpdate({}, { logoUrl }, { new: true, upsert: true });
    res.json({ logoUrl, settings });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/settings/favicon', authMiddleware, upload.single('favicon'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const faviconUrl = `/uploads/${req.file.filename}`;
    const settings = await SiteSettings.findOneAndUpdate({}, { faviconUrl }, { new: true, upsert: true });
    res.json({ faviconUrl, settings });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ==================== MENUS ====================

router.get('/menus', authMiddleware, async (req, res) => {
  try {
    const menus = await SiteMenu.find().sort({ createdAt: -1 });
    res.json(menus);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/menus/:id', authMiddleware, async (req, res) => {
  try {
    const menu = await SiteMenu.findById(req.params.id);
    if (!menu) return res.status(404).json({ message: 'Menu not found' });
    res.json(menu);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/menus', authMiddleware, async (req, res) => {
  try {
    const { name, location, items } = req.body;
    if (!name) return res.status(400).json({ message: 'Menu name is required' });
    const menu = await SiteMenu.create({ name, location: location || 'none', items: items || [] });
    res.status(201).json(menu);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/menus/:id', authMiddleware, async (req, res) => {
  try {
    const { name, location, items } = req.body;
    const update = {};
    if (name) update.name = name;
    if (location !== undefined) update.location = location;
    if (items !== undefined) update.items = items;
    const menu = await SiteMenu.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!menu) return res.status(404).json({ message: 'Menu not found' });
    res.json(menu);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/menus/:id', authMiddleware, async (req, res) => {
  try {
    const menu = await SiteMenu.findByIdAndDelete(req.params.id);
    if (!menu) return res.status(404).json({ message: 'Menu not found' });
    res.json({ message: 'Menu deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ==================== NOTIFICATIONS ====================

router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/notifications', authMiddleware, async (req, res) => {
  try {
    const { title, body, type, targetType, targetUsers } = req.body;
    if (!title || !body) return res.status(400).json({ message: 'Title and body are required' });
    const notification = await Notification.create({
      title, body,
      type: type || 'web',
      targetType: targetType || 'all',
      targetUsers: targetUsers || [],
    });
    res.status(201).json(notification);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/notifications/:id/send', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    // Get or generate VAPID keys
    let settings = await SiteSettings.findOne();
    if (!settings) settings = await SiteSettings.create({});
    if (!settings.vapidPublicKey || !settings.vapidPrivateKey) {
      const vapidKeys = webpush.generateVAPIDKeys();
      settings.vapidPublicKey = vapidKeys.publicKey;
      settings.vapidPrivateKey = vapidKeys.privateKey;
      await settings.save();
    }
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL || 'admin@spycon.com'}`,
      settings.vapidPublicKey,
      settings.vapidPrivateKey
    );

    // Get subscribers
    const subscriptions = await PushSubscription.find();
    if (subscriptions.length === 0) {
      notification.status = 'sent';
      notification.sentAt = new Date();
      notification.sentCount = 0;
      notification.failedCount = 0;
      await notification.save();
      return res.json({ message: 'No push subscribers found', notification });
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: '/favicon.ico',
      tag: `spycon-${notification._id}`,
      url: '/',
    });

    let sentCount = 0;
    let failedCount = 0;
    const failedEndpoints = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            payload
          );
          sentCount++;
        } catch (err) {
          failedCount++;
          failedEndpoints.push(sub.endpoint);
          if (err.statusCode === 404 || err.statusCode === 410) {
            await PushSubscription.deleteOne({ endpoint: sub.endpoint });
          }
        }
      })
    );

    notification.status = 'sent';
    notification.sentAt = new Date();
    notification.sentCount = sentCount;
    notification.failedCount = failedCount;
    await notification.save();

    res.json({
      message: `Sent to ${sentCount} subscribers, ${failedCount} failed`,
      notification,
      failedCount: failedCount > 0 ? undefined : undefined,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/notifications/:id', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ==================== PUBLIC ENDPOINTS ====================

// GET /api/website/menus/render?location=header
router.get('/menus/render', async (req, res) => {
  try {
    const { location = 'header' } = req.query;
    const menu = await SiteMenu.findOne({ location });
    if (!menu) return res.json({ items: [] });

    const resolveChildren = async (children) => {
      return Promise.all(children.map(async (item) => {
        const resolved = { ...(item.get ? item.get() : item) };
        if (item.type === 'page' && item.targetId) {
          const page = await Page.findOne({ where: { id: item.targetId }, attributes: ['slug'] });
          resolved.url = page ? `/p/${page.slug}` : '#';
        } else if (item.type === 'post' && item.targetId) {
          const post = await Post.findOne({ where: { id: item.targetId }, attributes: ['slug'] });
          resolved.url = post ? `/posts/${post.slug}` : '#';
        } else if (item.type === 'system_page') {
          resolved.url = item.url || '';
        } else if (item.type === 'url') {
          resolved.url = item.url || '#';
        }
        if (item.children?.length) {
          resolved.children = await resolveChildren(item.children);
        }
        return resolved;
      }));
    };

    const resolvedItems = await resolveChildren(menu.items || []);
    res.json({ items: resolvedItems });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/website/sitemap.xml
router.get('/sitemap.xml', async (req, res) => {
  try {
    const BASE_URL = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;

    const [pages, posts] = await Promise.all([
      Page.findAll({ where: { status: 'published' }, attributes: ['slug', 'updatedAt'] }),
      Post.findAll({ where: { status: 'published' }, attributes: ['slug', 'updatedAt'] }),
    ]);

    const urls = [
      ...pages.map(p => `<url><loc>${BASE_URL}/p/${p.slug}</loc><lastmod>${new Date(p.updatedAt).toISOString().split('T')[0]}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`),
      ...posts.map(p => `<url><loc>${BASE_URL}/posts/${p.slug}</loc><lastmod>${new Date(p.updatedAt).toISOString().split('T')[0]}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

    res.set('Content-Type', 'text/xml');
    res.send(xml);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/website/settings/public — public site settings (no auth)
router.get('/settings/public', async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();
    if (!settings) settings = await SiteSettings.create({});
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
