const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - Verify Token
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'docelex_super_secret_jwt_key_2026_dev');
    
    // Get user from database
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found with this token' });
    }
    
    next();
  } catch (error) {
    console.error('JWT Verification error:', error);
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid or expired' });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role || 'unknown'}' is not authorized to access this resource`,
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize,
};
