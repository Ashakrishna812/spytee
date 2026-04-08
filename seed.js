// SPYTEE TECH LMS - MySQL Database Seeder
// Run: node seed.js
// Note: The backend auto-syncs tables on startup. This script adds seed data.
require('dotenv').config();
const sequelize = require('./config/database');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Course = require('./models/Course');
const Admission = require('./models/Admission');
const AdminEmail = require('./models/AdminEmail');

const seed = async () => {
  try {
    await sequelize.authenticate();
    console.log('[SEED] Connected to MySQL');

    // Check if already seeded
    const existing = await AdminEmail.findOne({});
    if (existing) {
      console.log('[SEED] Database already seeded. Skipping.');
      process.exit(0);
    }

    // Seed super admin email
    await AdminEmail.create({
      email: process.env.SUPER_ADMIN_EMAIL || 'vatapatraharikrishna@gmail.com',
      addedBy: 'system'
    });
    console.log('[SEED] Admin email seeded');

    // Create super admin user (Google OAuth creates on first login)
    await User.create({
      name: 'Super Admin',
      email: process.env.SUPER_ADMIN_EMAIL || 'vatapatraharikrishna@gmail.com',
      role: 'admin',
      googleId: 'pending-google-login'
    });
    console.log('[SEED] Super admin user created');

    // Create sample students
    const student1 = await User.create({
      name: 'Rahul Kumar',
      email: 'rahul@student.com',
      phone: '9876543210',
      password: await bcrypt.hash('student123', 10),
      role: 'student',
      bio: 'Aspiring cybersecurity professional',
      googleId: 'sample-google-id-1'
    });

    const student2 = await User.create({
      name: 'Priya Sharma',
      email: 'priya@student.com',
      phone: '9876543211',
      password: await bcrypt.hash('student123', 10),
      role: 'student',
      bio: 'Cybersecurity enthusiast',
      googleId: 'sample-google-id-2'
    });

    console.log('[SEED] Sample students created');

    // Create courses
    const course1 = await Course.create({
      courseName: 'Cybersecurity Crash Course',
      description: 'A comprehensive introduction to cybersecurity fundamentals.',
      shortDescription: 'Master cybersecurity fundamentals with hands-on labs',
      thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600',
      category: 'Cybersecurity',
      level: 'Intermediate',
      duration: '6 hours 48 minutes',
      instructor: { name: 'Ranjith Adlakadi', title: 'Certified Ethical Hacker', bio: '10+ years experience' },
      rating: 4.5,
      ratingCount: 128,
      enrolledCount: 1,
      price: 999,
      contents: [
        { title: 'Cyber Defend Bootcamp', order: 0, lessons: [
          { title: 'Introduction to Cybersecurity', videoUrl: 'https://www.youtube.com/embed/inWWhr5tnEA', duration: '02:02:00', order: 0 },
          { title: 'Network Security Fundamentals', videoUrl: 'https://www.youtube.com/embed/inWWhr5tnEA', duration: '01:20:00', order: 1 }
        ]}
      ],
      materials: [
        { description: 'Cybersecurity Fundamentals PDF Guide' },
        { description: 'Network Security Cheat Sheet' }
      ],
      tags: ['cybersecurity', 'ethical hacking'],
      audience: ['IT Professionals', 'Security Engineers'],
      requirements: ['Basic computer knowledge'],
      includes: ['On-demand video', 'Certificate']
    });

    const course2 = await Course.create({
      courseName: 'Python for Networking & Security',
      description: 'Learn Python programming for network automation and cybersecurity.',
      shortDescription: 'Build security tools with Python',
      thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600',
      category: 'Programming',
      level: 'Beginner',
      duration: '8 hours 30 minutes',
      instructor: { name: 'Rohit Verma', title: 'Senior Python Developer', bio: 'Full stack developer' },
      rating: 4.7,
      ratingCount: 89,
      enrolledCount: 0,
      price: 799,
      contents: [
        { title: 'Python Basics for Security', order: 0, lessons: [
          { title: 'Setting Up Python', videoUrl: 'https://www.youtube.com/embed/kqtD5dpn9C8', duration: '00:30:00', order: 0 },
          { title: 'Variables & Data Types', videoUrl: 'https://www.youtube.com/embed/kqtD5dpn9C8', duration: '00:45:00', order: 1 }
        ]}
      ],
      materials: [{ description: 'Python Security Scripts Collection' }],
      tags: ['python', 'networking'],
      audience: ['Beginners'],
      requirements: ['No prior experience'],
      includes: ['On-demand video', 'Certificate']
    });

    console.log('[SEED] Courses created');

    // Enroll student1 in courses
    student1.enrolledCourses = [
      { courseId: course1.id, progress: 35, completedLessons: ['0-0'] }
    ];
    await student1.save();

    // Create pending admissions
    await Admission.create({ studentId: student2.id, courseId: course1.id, status: 'pending' });

    console.log('✅ Database seeded successfully!');
    console.log(`   Super Admin: ${process.env.SUPER_ADMIN_EMAIL} (Google Sign-In)`);
    console.log('   Sample Students: rahul@student.com / student123, priya@student.com / student123');
    process.exit(0);
  } catch (err) {
    console.error('[SEED] Error:', err.message);
    process.exit(1);
  }
};

seed();
