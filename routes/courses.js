const express = require('express');
const Course = require('../models/Course');
const { auth, adminOnly } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.xls', '.xlsx', '.zip', '.rar'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('File type not allowed'), false);
  },
});

// Get all courses
router.get('/', async (req, res) => {
  try {
    const { category, search, level } = req.query;
    const where = { isPublished: true };
    if (category) where.category = category;
    if (level) where.level = level;
    if (search) {
      where[Op.or] = [
        { courseName: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }
    const courses = await Course.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single course
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create course
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const course = await Course.create(req.body);
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update course
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    await course.update(req.body);
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete course
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    await course.destroy();
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload file
router.post('/upload', auth, adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      url: fileUrl,
      fileName: req.file.originalname,
      fileType: path.extname(req.file.originalname).toLowerCase(),
    });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Add review
router.post('/:id/reviews', auth, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const reviews = course.reviews || [];
    const existingReview = reviews.find(r => String(r.userId) === String(req.user.id));
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this course' });
    }

    const review = {
      userId: req.user.id,
      userName: req.user.name,
      rating: req.body.rating,
      comment: req.body.comment || '',
      createdAt: new Date(),
    };

    reviews.push(review);
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const rating = Math.round((totalRating / reviews.length) * 10) / 10;

    await course.update({ reviews, rating, ratingCount: reviews.length });
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add lesson comment
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const comment = {
      userId: req.user.id,
      userName: req.user.name,
      lessonKey: req.body.lessonKey,
      text: req.body.text,
      createdAt: new Date(),
    };

    const lessonComments = [...(course.lessonComments || []), comment];
    await course.update({ lessonComments });

    const lessonCommentList = lessonComments
      .filter(c => c.lessonKey === req.body.lessonKey)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(201).json(lessonCommentList);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get lesson comments
router.get('/:id/comments/:lessonKey', async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const comments = (course.lessonComments || [])
      .filter(c => c.lessonKey === req.params.lessonKey)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get categories
router.get('/meta/categories', async (req, res) => {
  try {
    const courses = await Course.findAll({ attributes: ['category'], group: ['category'] });
    res.json(courses.map(c => c.category));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
