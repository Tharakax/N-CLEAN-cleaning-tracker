/**
 * Script to add 3 cleaner accounts to the system
 * Run with: node src/seedCleaners.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const cleanersToSeed = [
  {
    name: 'Kasun Bandara',
    email: 'kasun.cleaner@gmail.com',
    password: 'cleaner123',
    role: 'cleaner',
  },
  {
    name: 'Nimali Perera',
    email: 'nimali.cleaner@gmail.com',
    password: 'cleaner123',
    role: 'cleaner',
  },
  {
    name: 'Sunil Shantha',
    email: 'sunil.cleaner@gmail.com',
    password: 'cleaner123',
    role: 'cleaner',
  },
];

const seedCleaners = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('cleaner123', salt);

    for (const cleanerData of cleanersToSeed) {
      const existing = await User.findOne({ email: cleanerData.email });
      if (!existing) {
        const created = await User.create({
          ...cleanerData,
          password: hashedPassword,
        });
        console.log(`🧹 Added cleaner: ${created.name} (${created.email})`);
      } else {
        console.log(`ℹ️ Cleaner already exists: ${cleanerData.name} (${cleanerData.email})`);
      }
    }

    console.log('✨ All 3 cleaners processed successfully.');
  } catch (err) {
    console.error('❌ Error seeding cleaners:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seedCleaners();
