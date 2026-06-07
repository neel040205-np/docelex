require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');

// Initialize app
const app = express();

// Connect to MongoDB
connectDB();

// Middlewares
app.use(cors({
  origin: '*', // For development flexibility; restrict in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
  app.use(morgan('dev'));
}

// Serve uploads directory statically for local storage fallback files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount API routes
app.use('/api', require('./routes/api'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    message: 'DocElex API is fully operational',
    timestamp: new Date(),
  });
});

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'API Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Define Port
const PORT = process.env.PORT || 5000;

// Listen
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Error occurred: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
