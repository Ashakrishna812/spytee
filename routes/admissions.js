const express = require('express');
const User = require('../models/User');
const Course = require('../models/Course');
const Admission = require('../models/Admission');
const { auth, adminOnly } = require('../middleware/auth');
const { Op, Sequelize } = require('sequelize');
const router = express.Router();

// Student: Request enrollment
router.post('/enroll', auth, async (req, res) => {
  try {
    const { courseId } = req.body;
    const existing = await Admission.findOne({
      where: {
        studentId: req.user.id,
        courseId,
        status: { [Op.in]: ['pending', 'accepted'] },
      },
    });
    if (existing) {
      return res.status(400).json({ message: 'Already applied or enrolled in this course' });
    }
    const admission = await Admission.create({
      studentId: req.user.id,
      courseId,
    });
    res.status(201).json(admission);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// TAB 1: Students
router.get('/tab/students', auth, adminOnly, async (req, res) => {
  try {
    const { search } = req.query;
    const where = { role: 'student' };
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { studentId: { [Op.like]: `%${search}%` } },
      ];
    }
    const students = await User.findAll({
      where,
      attributes: ['id', 'name', 'email', 'phone', 'studentId', 'isBanned', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// TAB 2: Pending
router.get('/tab/pending', auth, adminOnly, async (req, res) => {
  try {
    const { search } = req.query;
    const studentsWithPending = await Admission.findAll({
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('studentId')), 'studentId']],
      where: { status: 'pending' },
      raw: true,
    });
    const pendingIds = studentsWithPending.map(s => s.studentId).filter(Boolean);

    const where = { role: 'student' };
    if (pendingIds.length > 0) where.id = { [Op.notIn]: pendingIds };
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { studentId: { [Op.like]: `%${search}%` } },
      ];
    }

    const students = await User.findAll({
      where,
      attributes: ['id', 'name', 'email', 'phone', 'studentId', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// TAB 3: Enrolls
router.get('/tab/enrolls', auth, adminOnly, async (req, res) => {
  try {
    const { search } = req.query;
    const admissions = await Admission.findAll({
      where: { status: 'pending' },
      order: [['appliedAt', 'DESC']],
    });

    // Fetch related users and courses
    const userIds = [...new Set(admissions.map(a => a.studentId).filter(Boolean))];
    const courseIds = [...new Set(admissions.map(a => a.courseId).filter(Boolean))];
    const [users, courses] = await Promise.all([
      userIds.length > 0 ? User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'name', 'email', 'phone', 'studentId'] }) : [],
      courseIds.length > 0 ? Course.findAll({ where: { id: { [Op.in]: courseIds } }, attributes: ['id', 'courseName'] }) : [],
    ]);
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const courseMap = Object.fromEntries(courses.map(c => [c.id, c]));

    let filtered = admissions;
    if (search) {
      filtered = admissions.filter(a => {
        const u = userMap[a.studentId];
        return u?.name?.toLowerCase().includes(search.toLowerCase()) || u?.studentId?.includes(search);
      });
    }

    const grouped = {};
    filtered.forEach(adm => {
      if (!adm.studentId) return;
      if (!grouped[adm.studentId]) {
        grouped[adm.studentId] = { student: userMap[adm.studentId] || null, admissions: [] };
      }
      grouped[adm.studentId].admissions.push({
        _id: adm.id,
        courseId: adm.courseId,
        courseName: courseMap[adm.courseId]?.courseName || null,
        status: adm.status,
        appliedAt: adm.appliedAt,
      });
    });

    res.json(Object.values(grouped));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// TAB 4: Enrolled
router.get('/tab/enrolled', auth, adminOnly, async (req, res) => {
  try {
    const { search } = req.query;
    const where = { role: 'student' };
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { studentId: { [Op.like]: `%${search}%` } },
      ];
    }

    const students = await User.findAll({
      where,
      attributes: ['id', 'name', 'email', 'phone', 'studentId', 'enrolledCourses'],
      order: [['createdAt', 'DESC']],
    });

    const enrolled = students.filter(s => s.enrolledCourses && s.enrolledCourses.length > 0);

    // Enrich with course names
    const enriched = enrolled.map(s => {
      const courseIds = s.enrolledCourses.map(e => e.courseId).filter(Boolean);
      return { ...s.toJSON(), courseIds };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept enrollment
router.put('/:id/accept', auth, adminOnly, async (req, res) => {
  try {
    const admission = await Admission.findByPk(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Admission not found' });

    await admission.update({ status: 'accepted', processedAt: new Date() });

    const user = await User.findByPk(admission.studentId);
    if (user) {
      const existing = (user.enrolledCourses || []).some(
        e => String(e.courseId) === String(admission.courseId)
      );
      if (!existing) {
        await user.update({
          enrolledCourses: [
            ...(user.enrolledCourses || []),
            { courseId: admission.courseId, progress: 0, completedLessons: [], enrolledAt: new Date() },
          ],
        });
      }
    }
    await Course.increment('enrolledCount', { by: 1, where: { id: admission.courseId } });

    res.json({ message: 'Enrollment accepted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reject enrollment
router.put('/:id/reject', auth, adminOnly, async (req, res) => {
  try {
    const admission = await Admission.findByPk(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Admission not found' });

    await admission.update({ status: 'rejected', processedAt: new Date() });
    res.json({ message: 'Enrollment rejected' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove access
router.post('/remove-access', auth, adminOnly, async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    const user = await User.findByPk(studentId);
    if (!user) return res.status(404).json({ message: 'Student not found' });

    await user.update({
      enrolledCourses: (user.enrolledCourses || []).filter(
        e => String(e.courseId) !== String(courseId)
      ),
    });

    await Admission.update(
      { status: 'rejected', processedAt: new Date() },
      { where: { studentId, courseId, status: 'accepted' } }
    );
    await Course.decrement('enrolledCount', { by: 1, where: { id: courseId } });

    res.json({ message: 'Access removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check enrollment
router.get('/check/:courseId', auth, async (req, res) => {
  try {
    const admission = await Admission.findOne({
      where: { studentId: req.user.id, courseId: req.params.courseId },
    });
    res.json({ admission });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Stats
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const totalStudents = await User.count({ where: { role: 'student' } });
    const totalCourses = await Course.count();
    const pendingAdmissions = await Admission.count({ where: { status: 'pending' } });
    const totalEnrollments = await Admission.count({ where: { status: 'accepted' } });

    const acceptedAdmissions = await Admission.findAll({ where: { status: 'accepted' } });
    let totalRevenue = 0;
    if (acceptedAdmissions.length > 0) {
      const courseIds = acceptedAdmissions.map(a => a.courseId).filter(Boolean);
      if (courseIds.length > 0) {
        const courses = await Course.findAll({ where: { id: { [Op.in]: courseIds } }, attributes: ['id', 'price'] });
        const priceMap = Object.fromEntries(courses.map(c => [c.id, c.price]));
        totalRevenue = acceptedAdmissions.reduce((sum, adm) => sum + (priceMap[adm.courseId] || 0), 0);
      }
    }

    const recentAdmissions = await Admission.findAll({
      order: [['appliedAt', 'DESC']],
      limit: 10,
    });
    const recentUserIds = [...new Set(recentAdmissions.map(a => a.studentId).filter(Boolean))];
    const recentCourseIds = [...new Set(recentAdmissions.map(a => a.courseId).filter(Boolean))];
    const [recentUsers, recentCourses] = await Promise.all([
      recentUserIds.length > 0 ? User.findAll({ where: { id: { [Op.in]: recentUserIds } }, attributes: ['id', 'name', 'email'] }) : [],
      recentCourseIds.length > 0 ? Course.findAll({ where: { id: { [Op.in]: recentCourseIds } }, attributes: ['id', 'courseName'] }) : [],
    ]);
    const recentUserMap = Object.fromEntries(recentUsers.map(u => [u.id, u]));
    const recentCourseMap = Object.fromEntries(recentCourses.map(c => [c.id, c]));

    const enrichedRecent = recentAdmissions.map(adm => ({
      ...adm.toJSON(),
      studentName: recentUserMap[adm.studentId]?.name || '',
      studentEmail: recentUserMap[adm.studentId]?.email || '',
      courseName: recentCourseMap[adm.courseId]?.courseName || '',
    }));

    res.json({ totalStudents, totalCourses, pendingAdmissions, totalEnrollments, totalRevenue, recentAdmissions: enrichedRecent });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
