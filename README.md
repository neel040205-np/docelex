# DocElex - Student Document Management System

DocElex is a production-ready Student Document Management System built using the MERN stack (MongoDB, Express, React, Node.js), featuring JWT-based role authorization, automatic document audit logging, comprehensive metrics analytics, file export capabilities, and an adaptive dark-mode dashboard.

---

## Technical Stack

- **Backend**: Node.js, Express, Mongoose, JWT (Authentication), Multer + Cloudinary (Storage, with local fallback).
- **Frontend**: React (Vite), Ant Design v5, React Query (TanStack), Axios, Recharts.
- **Database**: MongoDB Atlas.

---

## Core Features

1. **Teacher Authentication**:
   - Single Teacher account with full access to register students, manage all details, upload documents, delete records, and view audit logs.
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
| **Teacher** | `teacher@docelex.com` | `Teacher@1234` |

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
