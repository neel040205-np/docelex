require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const updatePassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ email: 'teacher@docelex.com' });
    if (user) {
      user.password = 'Elex@1234';
      await user.save();
      console.log('Successfully updated password for teacher@docelex.com to Elex@1234');
    } else {
      console.log('User teacher@docelex.com not found');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error updating password:', err.message);
    process.exit(1);
  }
};

updatePassword();
