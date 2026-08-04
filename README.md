# DocElex - Student Document Management System

DocElex is a production-ready Student Document Management System built using the MERN stack (MongoDB, Express, React, Node.js), featuring JWT-based role authorization, automatic document audit logging, comprehensive metrics analytics, file export capabilities, and an adaptive dark-mode dashboard.

---

## Technical Stack

- **Backend**: Node.js, Express, Mongoose, JWT (Authentication), Multer + Cloudinary (Storage, with local fallback).
- **Frontend**: React (Vite), Ant Design v5, React Query (TanStack), Axios, Recharts.
- **Database**: MongoDB Atlas.

---

## Backend Architecture & Node.js Implementation

DocElex relies on a robust Node.js backend to handle complex operations like dynamic document generation, file vault streams, spreadsheet parsing, and secure authentication. 

### Why Node.js?
* **Unified Development Stack:** Standardizes on JavaScript/TypeScript across both React (Vite) and the API server, minimizing language context-switching.
* **Non-Blocking Asynchronous I/O:** The event-loop architecture allows DocElex to process multiple file uploads, database queries, and remote calls (Cloudinary/Google Drive) concurrently without queuing or blocking threads.
* **Rich NPM Ecosystem:** Leverages a wide array of library utilities for spreadsheet analysis (`xlsx`), document generation (`pdfkit`), compression (`archiver`), and secure parsing (`multer`, `bcryptjs`, `jsonwebtoken`).

### Implementation Structure
All Node.js backend files reside under the [`backend`](file:///Users/neelpatel/Desktop/DocElex/backend) directory:
* **[app.js](file:///Users/neelpatel/Desktop/DocElex/backend/src/app.js):** The main application entry point that initializes Express, connects to MongoDB, and binds middlewares (CORS, body parsing, dynamic model scopes).
* **[routes/api.js](file:///Users/neelpatel/Desktop/DocElex/backend/src/routes/api.js):** Outlines RESTful API endpoints for authentication, CRUD operations, document file vault, and analytics.
* **[controllers/studentController.js](file:///Users/neelpatel/Desktop/DocElex/backend/src/controllers/studentController.js):** Implements the bulk of operations including student database lifecycle, file streaming, PDF creation, and spreadsheet ingest.
* **[models/](file:///Users/neelpatel/Desktop/DocElex/backend/src/models/):** Maps database collections (Students, Documents, Audit Logs, Users) to structured schemas using the Mongoose ODM library.

### Core Backend Use Cases
1. **Dynamic ZIP Generation & Streaming:** In `studentController.js`, bulk document downloads construct ZIP files on the fly using `archiver` and pipe them directly into the response stream (`archive.pipe(res)`). This prevents high RAM utilization by avoiding loading files fully into server memory.
2. **File Vault Operations:** Integrates with `multer` and Cloudinary (or local filesystem fallback via the `fs` module) to manage file creations, duplicates, and deletions when students' document credentials update.
3. **Data Import/Export parsing:** 
   * Uses `xlsx` (SheetJS) to ingest Excel/CSV student registries for bulk student registrations.
   * Leverages `pdfkit` to compile dynamic student document lists into structured, downloadable PDF formats.
4. **JWT Security & Password Hashing:** Secures teacher endpoints via `jsonwebtoken` verification and `bcryptjs` encryption.

---

## Core Features

1. **Teacher Authentication**:
   - Authorized teachers can log in with their existing account credentials.
2. **Student Directory & Profiles**:
   - Detailed profile pages tracking GR Number, personal bio, family details, and address records.
   - Live query searching, filtering by academic class or division, and locating folders with missing documents.
3. **9 Required School Documents**:
   - Birth Certificate, Student Aadhaar, Father Aadhaar, Mother Aadhaar, Ration Card, Address Proof, Income Certificate, Caste Certificate, Passport Photo.
4. **Interactive File Vault**:
   - Single-click document upload/deletions with automatic format validations (PDF and Images).
5. **Dashboard Analytics**:
   - Total students count, records completeness pie rates, class distribution charts, and upload tracking bars.
6. **Chronological System Auditing**:
   - Comprehensive chronological timeline tracking registrations, edits, file changes, deletes, and logins.
7. **Report Exports**:
   - Download the directory data dynamically into Excel (`.xlsx`), CSV (`.csv`), or printable landscape PDF (`.pdf`) format.

---

## Default Login Credentials

After seeding, the following demo logins are created:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Teacher** | `teacher@docelex.com` | `Elex@1234` |

---

## Setup & Running Locally

### Prerequisites
- Node.js (v18+)
- MongoDB running locally (defaulting to port 27017) or MongoDB Atlas URI

### Step 1: Install Dependencies
Install packages for both systems:
```bash
# Install backend dependencies
cd backend
npm install --legacy-peer-deps

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Environment Variables
Create a `.env` file in the `backend/` directory (you can copy `backend/.env.example`):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/docelex
JWT_SECRET=docelex_super_secret_jwt_key_2026_dev
JWT_EXPIRE=30d

# Optional: Cloudinary Credentials
# If left blank, uploads will save locally under backend/uploads/ and be served dynamically
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Step 3: Seed the Database
Seed default users and mock student data for quick evaluation:
```bash
cd backend
npm run seed
```

### Step 4: Run the Application
Launch both backend and frontend servers:

```bash
# In backend/ directory
npm run dev

# In frontend/ directory (in a separate terminal)
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## API Documentation

- **Auth**:
  - `POST /api/auth/login` - Public login session generation.
  - `GET /api/auth/me` - Fetch profile metadata for logged-in user.
- **Students**:
  - `GET /api/students` - Paginated, filterable directory query.
  - `POST /api/students` - Register a student.
  - `GET /api/students/:id` - Fetch detailed bio + documents.
  - `PUT /api/students/:id` - Update metadata fields.
  - `DELETE /api/students/:id` - Remove record + all storage files.
- **Documents**:
  - `POST /api/students/:id/document/:documentType` - Upload file to field (Multer multipart/form-data).
  - `DELETE /api/students/:id/document/:documentType` - Delete file from field.
- **Analytics & Logs**:
  - `GET /api/stats` - Fetch aggregated analytics for charts.
  - `GET /api/audit-logs` - Chronological trace list of system operations.
- **Exports**:
  - `GET /api/students/export/csv` - CSV table download stream.
  - `GET /api/students/export/excel` - Excel worksheet binary download.
  - `GET /api/students/export/pdf` - PDF booklet download.

---

## Load & Performance Testing (Grafana k6)

To test the application safely without polluting your live MongoDB Atlas production database or slowing down active teacher profiles, always run performance tests against a **local development server** connected to a **local MongoDB instance**.

### Step 1: Install Grafana k6
Install `k6` on your local system using your package manager:
* **macOS (via Homebrew):**
  ```bash
  brew install k6
  ```
* **Windows (via Chocolatey):**
  ```bash
  choco install k6
  ```
* **Linux (Debian/Ubuntu):**
  ```bash
  sudo gpg -k
  sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5D5E67500AC7577
  echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
  sudo apt-get update
  sudo apt-get install k6
  ```

### Step 2: Configure a Safe Local Environment
1. Open your local `backend/.env` file.
2. Temporarily replace the `MONGODB_URI` with your local MongoDB connection string:
   ```env
   # Safe local database (do not point this to your Atlas production link during tests)
   MONGODB_URI=mongodb://127.0.0.1:27017/docelex_test
   PORT=5002
   ```
3. Seed the local database with clean default test records:
   ```bash
   cd backend
   npm run seed
   ```
4. Start your local server:
   ```bash
   npm run dev
   ```

### Step 3: Execute the Load Test
In a new terminal window, run the k6 load test:
```bash
cd backend
k6 run tests/load_test.js
```

### Step 4: Reset & Rollback Database
Once testing completes, you can clear all mock performance records and revert the database back to clean defaults by running:
```bash
npm run seed
```
Revert your `backend/.env` file `MONGODB_URI` to your MongoDB Atlas connection string when you are ready to return to development/production.

### Load Test Execution Reports

#### 🟢 Baseline Load Test (20 VUs)
Executed on July 9, 2026, against the local environment:
- **Simulation Profile:** Ramped up from 1 to 20 concurrent Virtual Users (VUs) over 61 seconds.
- **Success Criteria (Thresholds):**
  - **Error Rate:** 0.00% failed requests (Threshold: < 2%) — **PASSED**
  - **95th Percentile Response Time:** 160.45 ms (Threshold: < 800ms) — **PASSED**
- **Metrics Summary:**
  - **Total HTTP Requests Made:** 888 requests (14.42 requests/second average)
  - **Checks Succeeded:** 100.00% (1110 / 1110 assertions)
  - **Latency:** Average: 41.56 ms | Median: 7.63 ms | 95th Percentile: 160.45 ms

#### 🔴 High-Concurrency Stress Test (200 VUs - Bottleneck Analysis)
Executed on July 9, 2026, to determine the application's breaking point under high-concurrency authentication and query spikes:
- **Simulation Profile:** Ramped up from 1 to 100 VUs (20s), scaled up to 200 VUs (40s), and ramped down to 0 VUs (20s).
- **Success Criteria (Thresholds):**
  - **Error Rate:** 2.25% failed requests (Threshold: < 2%) — **FAILED** (82 out of 3634 requests failed)
  - **95th Percentile Response Time:** 8.14 seconds (Threshold: < 1.5s) — **FAILED**
- **Performance Insights & Bottleneck Identifications:**
  - **The Bcrypt CPU Queue:** As concurrent requests scaled past 120 VUs, the CPU-intensive password hashing library (`bcryptjs`) created a bottleneck on Node.js's single-threaded event loop. This caused requests to stack in queue, pushing average response times up to 1.96s (max 11.49s) and triggering `connection reset by peer` errors (2.25% error rate).
  - **Database Connection Congestion:** Concurrently spawning user-specific dynamic collections under high volume increased lookup latencies.
  - **Conclusion:** The local Express/Node server safely handles up to 100-120 concurrent user authentication events. Scaling higher requires introducing password hashing offloading (e.g., using worker threads), horizontal scaling, or clustering.



