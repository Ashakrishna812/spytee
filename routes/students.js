const express = require('express');
const User = require('../models/User');
const Course = require('../models/Course');
const { auth } = require('../middleware/auth');
const { Op } = require('sequelize');
const router = express.Router();

// Get dashboard stats
router.get('/dashboard', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const enrolled = (user.enrolledCourses || []).length;
    const completed = (user.enrolledCourses || []).filter(c => c.progress >= 100).length;
    const active = enrolled - completed;
    res.json({ enrolled, active, completed });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get enrolled courses
router.get('/enrolled', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const courseIds = (user.enrolledCourses || []).map(c => c.courseId).filter(Boolean);
    if (courseIds.length === 0) return res.json([]);

    const courses = await Course.findAll({ where: { id: { [Op.in]: courseIds } } });
    const enrolledData = courses.map(course => {
      const enrollment = (user.enrolledCourses || []).find(
        e => String(e.courseId) === String(course.id)
      );
      return {
        ...course.toJSON(),
        progress: enrollment?.progress || 0,
        completedLessons: enrollment?.completedLessons || [],
        enrolledAt: enrollment?.enrolledAt,
      };
    });
    res.json(enrolledData);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, bio, jobTitle, socialLinks } = req.body;
    await req.user.update({ name, phone, bio, jobTitle, socialLinks });
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['activeSessionId'] },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle wishlist
router.post('/wishlist/:courseId', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const courseId = String(req.params.courseId);
    const wishlist = user.wishlist || [];
    const idx = wishlist.indexOf(courseId);
    if (idx > -1) {
      wishlist.splice(idx, 1);
    } else {
      wishlist.push(courseId);
    }
    await user.update({ wishlist });
    res.json({ wishlist });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get wishlist
router.get('/wishlist', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const wishlistIds = (user.wishlist || []).filter(Boolean);
    if (wishlistIds.length === 0) return res.json([]);
    const courses = await Course.findAll({ where: { id: { [Op.in]: wishlistIds } } });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark lesson complete
router.post('/lesson-complete', auth, async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;
    const user = await User.findByPk(req.user.id);
    const enrollment = (user.enrolledCourses || []).find(
      e => String(e.courseId) === String(courseId)
    );
    if (!enrollment) {
      return res.status(400).json({ message: 'Not enrolled in this course' });
    }
    const completedLessons = enrollment.completedLessons || [];
    if (!completedLessons.includes(lessonId)) {
      completedLessons.push(lessonId);
    }

    const course = await Course.findByPk(courseId);
    let totalLessons = 0;
    (course.contents || []).forEach(section => { totalLessons += (section.lessons || []).length; });
    const progress = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0;

    const updatedCourses = (user.enrolledCourses || []).map(e => {
      if (String(e.courseId) === String(courseId)) {
        return { ...e, completedLessons, progress };
      }
      return e;
    });

    await user.update({ enrolledCourses: updatedCourses });
    res.json({ progress, completedLessons });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
