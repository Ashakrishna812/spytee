const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const MediaItem = require('../models/MediaItem');
const { auth } = require('../middleware/auth');
const { Op } = require('sequelize');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'media');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'), false);
  },
});

router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 30, folder = '', search = '' } = req.query;
    const where = {};
    if (folder) where.folder = folder;
    if (search) where.originalName = { [Op.like]: `%${search}%` };

    const { count, rows } = await MediaItem.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset: (parseInt(page) - 1) * parseInt(limit),
      limit: parseInt(limit),
    });

    res.json({ items: rows, total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const url = `/uploads/media/${req.file.filename}`;
    const item = await MediaItem.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url,
      folder: req.body.folder || 'general',
      alt: req.body.alt || '',
      uploadedBy: req.user?.id,
    });

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { alt, folder } = req.body;
    const update = {};
    if (alt !== undefined) update.alt = alt;
    if (folder !== undefined) update.folder = folder;

    await MediaItem.update(update, { where: { id: req.params.id } });
    const item = await MediaItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Media item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await MediaItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Media item not found' });

    const filePath = path.join(UPLOAD_DIR, item.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await item.destroy();
    res.json({ message: 'Media item deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
