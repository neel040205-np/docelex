require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Connected to database: ${conn.connection.host}`);
  } catch (error) {
    console.error(`DB connection failed: ${error.message}`);
    process.exit(1);
  }
};

const users = [
  { name: 'Hitendra', email: 'teacher@dochitendra.com', password: 'Hitendra@1234', role: 'teacher' },
  { name: 'Anila', email: 'teacher@docanila.com', password: 'Anila@1234', role: 'teacher' },
  { name: 'Neel', email: 'teacher@docneel.com', password: 'Neel@1234', role: 'teacher' },
  { name: 'Rajesh', email: 'teacher@docrajesh.com', password: 'Rajesh@1234', role: 'teacher' },
  { name: 'Sunita', email: 'teacher@docsunita.com', password: 'Sunita@1234', role: 'teacher' },
  { name: 'Amit', email: 'teacher@docamit.com', password: 'Amit@1234', role: 'teacher' },
  { name: 'Meena', email: 'teacher@docmeena.com', password: 'Meena@1234', role: 'teacher' },
  { name: 'Sanjay', email: 'teacher@docsanjay.com', password: 'Sanjay@1234', role: 'teacher' },
  { name: 'Ritu', email: 'teacher@docritu.com', password: 'Ritu@1234', role: 'teacher' },
  { name: 'Raman', email: 'teacher@docraman.com', password: 'Raman@1234', role: 'teacher' }
];

const seedUsers = async () => {
  await connectDB();
  console.log('Seeding 10 users...');

  let successCount = 0;
  for (const userData of users) {
    try {
      // Find user by email. If they exist, update their fields. If not, create them.
      let user = await User.findOne({ email: userData.email.toLowerCase() });
      if (user) {
        user.name = userData.name;
        user.password = userData.password; // pre-save hook will hash this on save()
        await user.save();
        console.log(`Updated user: ${userData.email}`);
      } else {
        user = new User(userData);
        await user.save();
        console.log(`Created user: ${userData.email}`);
      }
      successCount++;
    } catch (err) {
      console.error(`Failed to seed user ${userData.email}:`, err.message);
    }
  }

  console.log(`Seeding completed. Successfully seeded ${successCount}/10 users.`);
  process.exit(0);
};

seedUsers();
