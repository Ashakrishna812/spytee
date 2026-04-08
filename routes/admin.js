const express = require('express');
const AdminEmail = require('../models/AdminEmail');
const User = require('../models/User');
const { auth, adminOnly, superAdminOnly } = require('../middleware/auth');
const { Op } = require('sequelize');
const router = express.Router();

// Get all admin emails
router.get('/emails', auth, adminOnly, async (req, res) => {
  try {
    const emails = await AdminEmail.findAll({ order: [['created_at', 'DESC']] });
    res.json(emails);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add admin email
router.post('/emails', auth, adminOnly, superAdminOnly, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const existing = await AdminEmail.findOne({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(400).json({ message: 'Email already exists as admin' });

    const adminEmail = await AdminEmail.create({
      email: email.toLowerCase(),
      addedBy: req.user.email,
    });

    await User.update({ role: 'admin' }, { where: { email: email.toLowerCase() } });

    res.status(201).json(adminEmail);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove admin email
router.delete('/emails/:id', auth, adminOnly, superAdminOnly, async (req, res) => {
  try {
    const adminEmail = await AdminEmail.findByPk(req.params.id);
    if (!adminEmail) return res.status(404).json({ message: 'Admin email not found' });

    if (adminEmail.email === process.env.SUPER_ADMIN_EMAIL) {
      return res.status(400).json({ message: 'Cannot remove the super admin email' });
    }

    await adminEmail.destroy();
    await User.update({ role: 'student' }, { where: { email: adminEmail.email } });

    res.json({ message: 'Admin removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Ban/Unban student
router.put('/students/:id/ban', auth, adminOnly, async (req, res) => {
  try {
    const { isBanned } = req.body;
    await User.update(
      { isBanned, activeSessionId: '' },
      { where: { id: req.params.id } }
    );
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['activeSessionId'] },
    });
    if (!user) return res.status(404).json({ message: 'Student not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
