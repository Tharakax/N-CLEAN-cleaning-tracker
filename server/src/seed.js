/**
 * Seed Script - Creates the default admin user.
 * Run with: node src/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Remove any existing admin
    await User.deleteMany({ role: 'admin' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const admin = await User.create({
      name: 'Administrator',
      email: 'admin@gmail.com',
      password: hashedPassword,
      role: 'admin',
    });

    console.log(`🌱 Admin seeded: ${admin.email} / admin123`);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seedAdmin();
