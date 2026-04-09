const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    const secret = process.env.JWT_SECRET || 'spytee_jwt_secret_key_2024_ultra_secure';
    const decoded = jwt.verify(token, secret);
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    if (user.isBanned) {
      return res.status(403).json({ message: 'Your account has been banned. Contact the administrator.' });
    }
    req.user = user;
    req.sessionId = decoded.sessionId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

const superAdminOnly = (req, res, next) => {
  if (req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
    return res.status(403).json({ message: 'Access denied. Super admin only.' });
  }
  next();
};

module.exports = { auth, adminOnly, superAdminOnly };
