const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getAuditLogModel } = require('../utils/dynamicModels');

// Generate JWT token helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'docelex_super_secret_jwt_key_2026_dev', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

const sendAuthResponse = (res, user, statusCode = 200) => {
  const token = generateToken(user._id);

  return res.status(statusCode).json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check for user
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide an email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Write audit log for login using dynamic scoped model
    const AuditLogModel = getAuditLogModel(user._id);
    await AuditLogModel.create({
      action: 'USER_LOGIN',
      performedBy: user._id,
      details: `${user.name} logged in successfully`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    });

    return sendAuthResponse(res, user);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
