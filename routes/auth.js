const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const AdminEmail = require('../models/AdminEmail');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Google Sign-In
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'No credential provided' });
    }

    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!response.ok) {
      return res.status(401).json({ message: 'Invalid Google token' });
    }
    const payload = await response.json();

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId !== 'YOUR_GOOGLE_CLIENT_ID_HERE' && payload.aud !== clientId) {
      return res.status(401).json({ message: 'Token not intended for this app' });
    }

    const { email, name, sub: googleId, picture } = payload;

    const isAdmin = await AdminEmail.findOne({ where: { email: email.toLowerCase() } });
    const role = isAdmin ? 'admin' : 'student';

    if (req.body.panel === 'admin' && !isAdmin) {
      return res.status(403).json({ message: 'Access denied. You are not authorized as an admin.' });
    }

    let user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (user) {
      if (user.isBanned) {
        return res.status(403).json({ message: 'Your account has been banned. Contact the administrator.' });
      }
      const sessionId = uuidv4();
      await user.update({
        googleId,
        avatar: (!user.avatar && picture) ? picture : user.avatar,
        name: (!user.name || user.name === email) ? name : user.name,
        role,
        activeSessionId: sessionId,
        lastActiveAt: new Date(),
      });

      const token = jwt.sign({ userId: user.id, sessionId }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          phone: user.phone,
          studentId: user.studentId,
          sessionId,
        },
      });
    } else {
      const studentId = role === 'student' ? await User.generateStudentId() : null;
      const sessionId = uuidv4();
      user = await User.create({
        name,
        email: email.toLowerCase(),
        googleId,
        avatar: picture || '',
        role,
        studentId,
        activeSessionId: sessionId,
        lastActiveAt: new Date(),
      });

      const token = jwt.sign({ userId: user.id, sessionId }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          phone: user.phone,
          studentId: user.studentId,
          sessionId,
        },
      });
    }
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Authentication failed', error: error.message });
  }
});

// Heartbeat
router.post('/heartbeat', auth, async (req, res) => {
  try {
    await req.user.update({ lastActiveAt: new Date() });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Check session
router.post('/check-session', auth, async (req, res) => {
  try {
    if (req.user.activeSessionId !== req.body.sessionId) {
      return res.status(403).json({ message: 'Session expired. Account is active on another device.', code: 'SESSION_CONFLICT' });
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['activeSessionId'] },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
