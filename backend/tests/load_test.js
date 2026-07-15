import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 configuration for local load simulation
export const options = {
  stages: [
    { duration: '20s', target: 100 }, // Ramp up to 100 virtual users
    { duration: '40s', target: 200 }, // Stay at / ramp up to 200 virtual users
    { duration: '20s', target: 0 },   // Ramp down to 0 virtual users
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'], // 95% of requests must complete under 1.5s under heavy 200 VUs load
    http_req_failed: ['rate<0.02'],    // Error rate must remain less than 2%
  },
};

const PORT = 5002;
const BASE_URL = `http://localhost:${PORT}/api`;

export default function () {
  // 1. Authenticate safely using the seeded teacher credentials
  const loginPayload = JSON.stringify({
    email: 'teacher@docneel.com',
    password: 'Neel@1234',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, params);
  
  const loginOk = check(loginRes, {
    'login status is 200': (res) => res.status === 200,
    'jwt token received': (res) => res.json().token !== undefined,
  });

  if (!loginOk) {
    console.error('Login failed! Verify the local backend is running and database is seeded.');
    sleep(1);
    return;
  }

  const token = loginRes.json().token;
  const authHeaders = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  // 2. Load Dashboard Statistics
  const statsRes = http.get(`${BASE_URL}/stats`, authHeaders);
  check(statsRes, {
    'dashboard stats loaded': (res) => res.status === 200,
  });

  // 3. Load Student Directory (Page 1)
  const studentsRes = http.get(`${BASE_URL}/students?page=1&limit=10`, authHeaders);
  check(studentsRes, {
    'student directory page 1 loaded': (res) => res.status === 200,
  });

  // 4. Perform a dynamic search check
  const searchRes = http.get(`${BASE_URL}/students?search=test`, authHeaders);
  check(searchRes, {
    'directory search response ok': (res) => res.status === 200,
  });

  // Simulate think time (2 to 4 seconds)
  sleep(Math.random() * 2 + 2);
}
