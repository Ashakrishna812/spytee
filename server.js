require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const sequelize = require('./config/database');

const app = express();

// Test database connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('[MYSQL] Connection established successfully.');
    // Sync all models (creates tables if they don't exist)
    await sequelize.sync({ alter: false });
    console.log('[MYSQL] All tables synchronized.');
  } catch (err) {
    console.error('[MYSQL] Unable to connect:', err.message);
    console.log('[MYSQL] Server will continue without database — configure DB_* env vars to connect.');
  }
}
testConnection();

// Security middleware
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));
app.use(cors({
  origin: [
    'https://spyteetech.site',
    'https://spyteetechadmin.spyteetech.site',
    'https://api.spyteetech.site',
    'http://localhost:5173',
    'http://localhost:5174',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving (no directory listing)
app.use('/uploads', express.static('uploads', { dotfiles: 'deny', index: false }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/students', require('./routes/students'));
app.use('/api/admissions', require('./routes/admissions'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/pages', require('./routes/pages'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/website', require('./routes/website'));
app.use('/api/media', require('./routes/media'));
app.use('/api/push', require('./routes/push'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SPYTEE TECH API is running' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`SPYTEE TECH API Server running on port ${PORT}`);
});
