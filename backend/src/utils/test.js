const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const express = require('express');
const mongoose = require('mongoose');

// We'll boot a light version of the server on port 5001 for test validation
const app = express();
app.use(express.json());
app.use('/api', require('../routes/api'));

const PORT = 5001;
let server;

const startServer = () => {
  return new Promise((resolve, reject) => {
    server = app.listen(PORT, () => {
      console.log(`Test server running on port ${PORT}`);
      resolve();
    }).on('error', (err) => {
      reject(err);
    });
  });
};

const stopServer = () => {
  return new Promise((resolve) => {
    server.close(() => {
      console.log('Test server closed.');
      mongoose.connection.close().then(() => {
        console.log('DB connection closed.');
        resolve();
      });
    });
  });
};

// Simple HTTP request helper
const makeRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data),
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
};

const runTests = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/docelex');
    await startServer();

    console.log('\n--- Running Backend Integration Tests ---');
    
    // Test 1: Unauthenticated request to protected route (should return 401)
    console.log('Test 1: GET /api/students without token...');
    const res1 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/students',
      method: 'GET',
    });
    if (res1.statusCode === 401 && res1.body.success === false) {
      console.log('✅ PASS: Unauthorized access blocked successfully.');
    } else {
      throw new Error(`FAIL: Expected 401 Unauthorized, got ${res1.statusCode}`);
    }

    // Test 2: Authenticate with default teacher credentials
    console.log('Test 2: POST /api/auth/login with Teacher credentials...');
    const res2 = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      {
        email: 'teacher@docelex.com',
        password: 'Teacher@1234',
      }
    );
    let token = '';
    if (res2.statusCode === 200 && res2.body.success === true && res2.body.token) {
      token = res2.body.token;
      console.log('✅ PASS: Login authentication generated JWT token successfully.');
    } else {
      throw new Error(`FAIL: Expected 200 OK and JWT, got ${res2.statusCode} and ${JSON.stringify(res2.body)}`);
    }

    // Test 3: Authenticated request to get stats
    console.log('Test 3: GET /api/stats with valid token...');
    const res3 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/stats',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (res3.statusCode === 200 && res3.body.success === true && res3.body.data.metrics) {
      console.log(`✅ PASS: Stats retrieved successfully. Total students in DB: ${res3.body.data.metrics.totalStudents}`);
    } else {
      throw new Error(`FAIL: Expected 200 OK with metrics, got ${res3.statusCode}`);
    }

    // Test 4: Authenticated request to list students
    console.log('Test 4: GET /api/students with valid token...');
    const res4 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/students',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (res4.statusCode === 200 && res4.body.success === true && Array.isArray(res4.body.data)) {
      console.log(`✅ PASS: Student directory retrieved successfully. Count: ${res4.body.data.length}`);
    } else {
      throw new Error(`FAIL: Expected 200 OK with student list, got ${res4.statusCode}`);
    }

    console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n');
  } catch (err) {
    console.error(`\n❌ TEST SUITE RUNTIME ERROR: ${err.message}\n`);
    process.exitCode = 1;
  } finally {
    await stopServer();
  }
};

runTests();
