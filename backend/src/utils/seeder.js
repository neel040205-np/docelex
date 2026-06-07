require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://neelpatelnp0402_db_user:Neel0402%23%40@docelex.1x1y2lf.mongodb.net/?appName=docelex');
    console.log(`Seeder database connection established: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Seeder DB connection failed: ${error.message}`);
    process.exit(1);
  }
};




const mockStudentsData = (teacherId) => [
  {
    name: 'Aarav Sharma',
    grNumber: 'GR10001',
    class: 'Class 5',
    division: 'A',
    dob: new Date('2016-04-12'),
    gender: 'male',
    fatherName: 'Rajesh Sharma',
    motherName: 'Sunita Sharma',
    mobile: '9876543210',
    address: '102 Shanti Kunj, Station Road',
    village: 'Bardoli',
    taluka: 'Bardoli',
    district: 'Surat',
    createdBy: teacherId,
    updatedBy: teacherId,
    documents: {},
  },
  {
    name: 'Diya Patel',
    grNumber: 'GR10002',
    class: 'Class 6',
    division: 'B',
    dob: new Date('2015-08-23'),
    gender: 'female',
    fatherName: 'Amit Patel',
    motherName: 'Meena Patel',
    mobile: '9823456789',
    address: 'A-45 Gokuldham Society',
    village: 'Kamrej',
    taluka: 'Kamrej',
    district: 'Surat',
    createdBy: teacherId,
    updatedBy: teacherId,
    documents: {},
  },
  {
    name: 'Kabir Mehta',
    grNumber: 'GR10003',
    class: 'Class 5',
    division: 'A',
    dob: new Date('2016-11-05'),
    gender: 'male',
    fatherName: 'Sanjay Mehta',
    motherName: 'Ritu Mehta',
    mobile: '9988776655',
    address: '7B Sagar Darshan Towers',
    village: 'Olpad',
    taluka: 'Olpad',
    district: 'Surat',
    createdBy: teacherId,
    updatedBy: teacherId,
    documents: {},
  },
  {
    name: 'Ananya Iyer',
    grNumber: 'GR10004',
    class: 'Class 8',
    division: 'C',
    dob: new Date('2013-02-14'),
    gender: 'female',
    fatherName: 'Raman Iyer',
    motherName: 'Lakshmi Iyer',
    mobile: '9765432109',
    address: 'Flat 501, Whispering Woods',
    village: 'Palsana',
    taluka: 'Palsana',
    district: 'Surat',
    createdBy: teacherId,
    updatedBy: teacherId,
    documents: {},
  },
  {
    name: 'Rohan Deshmukh',
    grNumber: 'GR10005',
    class: 'Class 7',
    division: 'B',
    dob: new Date('2014-06-30'),
    gender: 'male',
    fatherName: 'Milind Deshmukh',
    motherName: 'Sheetal Deshmukh',
    mobile: '9012345678',
    address: 'Rowhouse No 12, Regency Park',
    village: 'Mandvi',
    taluka: 'Mandvi',
    district: 'Surat',
    createdBy: teacherId,
    updatedBy: teacherId,
    documents: {},
  },
  {
    name: 'Ishaan Verma',
    grNumber: 'GR10006',
    class: 'Class 5',
    division: 'B',
    dob: new Date('2016-01-20'),
    gender: 'male',
    fatherName: 'Vikas Verma',
    motherName: 'Priya Verma',
    mobile: '9123456780',
    address: 'H-90 Landmark Residency',
    village: 'Mahuva',
    taluka: 'Mahuva',
    district: 'Surat',
    createdBy: teacherId,
    updatedBy: teacherId,
    documents: {},
  },
  {
    name: 'Sanya Gupta',
    grNumber: 'GR10007',
    class: 'Class 6',
    division: 'A',
    dob: new Date('2015-10-02'),
    gender: 'female',
    fatherName: 'Nitin Gupta',
    motherName: 'Komal Gupta',
    mobile: '9234567891',
    address: 'B-303 Green Valley Flats',
    village: 'Chalthan',
    taluka: 'Palsana',
    district: 'Surat',
    createdBy: teacherId,
    updatedBy: teacherId,
    documents: {},
  },
  {
    name: 'Vivaan Joshi',
    grNumber: 'GR10008',
    class: 'Class 8',
    division: 'A',
    dob: new Date('2013-12-25'),
    gender: 'male',
    fatherName: 'Deepak Joshi',
    motherName: 'Alpa Joshi',
    mobile: '9345678912',
    address: '32 Dev Darshan Society',
    village: 'Navsari',
    taluka: 'Navsari',
    district: 'Navsari',
    createdBy: teacherId,
    updatedBy: teacherId,
    documents: {},
  },
  {
    name: 'Meera Nair',
    grNumber: 'GR10009',
    class: 'Class 7',
    division: 'A',
    dob: new Date('2014-03-09'),
    gender: 'female',
    fatherName: 'Balakrishnan Nair',
    motherName: 'Radha Nair',
    mobile: '9456789123',
    address: 'A-201 Coral Heights',
    village: 'Gandevi',
    taluka: 'Gandevi',
    district: 'Navsari',
    createdBy: teacherId,
    updatedBy: teacherId,
    documents: {},
  },
  {
    name: 'Aditya Sen',
    grNumber: 'GR10010',
    class: 'Class 9',
    division: 'A',
    dob: new Date('2012-07-18'),
    gender: 'male',
    fatherName: 'Arup Sen',
    motherName: 'Moushumi Sen',
    mobile: '9567891234',
    address: 'C-707 Harmony Heights',
    village: 'Chikhli',
    taluka: 'Chikhli',
    district: 'Navsari',
    createdBy: teacherId,
    updatedBy: teacherId,
    documents: {},
  },
];

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('Clearing existing database records...');
    await User.deleteMany({});
    await Student.deleteMany({});
    await AuditLog.deleteMany({});

    console.log('Seeding teacher account...');
    const teacherUser = await User.create({
      name: 'Teacher',
      email: 'teacher@docelex.com',
      password: 'Teacher@1234',
      role: 'teacher',
    });

    console.log(`Seeded User:`);
    console.log(`- Teacher: teacher@docelex.com / Teacher@1234`);

    // Create Students
    console.log('Seeding mock students...');
    const studentsData = mockStudentsData(teacherUser._id);
    
    
    
    // Inject mock uploaded document placeholders to simulate real states
    // Student 1 (Aarav): complete uploads
    studentsData[0].documents = {
      birthCertificate: {
        url: 'https://res.cloudinary.com/demo/image/upload/v1580282455/sample.jpg',
        publicId: 'sample_bc',
        fileName: 'aarav_birth_cert.jpg',
        uploadedBy: teacherUser._id,
        uploadedAt: new Date(),
      },
      studentAadhaar: {
        url: 'https://res.cloudinary.com/demo/image/upload/v1580282455/sample.jpg',
        publicId: 'sample_sa',
        fileName: 'aarav_aadhaar.jpg',
        uploadedBy: teacherUser._id,
        uploadedAt: new Date(),
      },
      passportPhoto: {
        url: 'https://res.cloudinary.com/demo/image/upload/v1580282455/sample.jpg',
        publicId: 'sample_pp',
        fileName: 'aarav_photo.jpg',
        uploadedBy: teacherUser._id,
        uploadedAt: new Date(),
      },
    };

    // Student 2 (Diya): partial uploads
    studentsData[1].documents = {
      studentAadhaar: {
        url: 'https://res.cloudinary.com/demo/image/upload/v1580282455/sample.jpg',
        publicId: 'sample_da_sa',
        fileName: 'diya_aadhaar.jpg',
        uploadedBy: teacherUser._id,
        uploadedAt: new Date(),
      },
      fatherAadhaar: {
        url: 'https://res.cloudinary.com/demo/image/upload/v1580282455/sample.jpg',
        publicId: 'sample_da_fa',
        fileName: 'father_aadhaar.png',
        uploadedBy: teacherUser._id,
        uploadedAt: new Date(),
      },
    };

    // Save
    const seededStudents = await Student.create(studentsData);
    console.log(`Successfully seeded ${seededStudents.length} mock student records.`);

    // Write some initial Audit Logs
    console.log('Writing default audit logs...');
    await AuditLog.create([
      {
        action: 'CREATE_STUDENT',
        performedBy: teacherUser._id,
        studentId: seededStudents[0]._id,
        studentName: seededStudents[0].name,
        details: 'Initial system seeding: Aarav Sharma registered',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      },
      {
        action: 'UPLOAD_DOCUMENT',
        performedBy: teacherUser._id,
        studentId: seededStudents[0]._id,
        studentName: seededStudents[0].name,
        details: 'Uploaded Birth Certificate for Aarav Sharma',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1.8),
      },
      {
        action: 'CREATE_STUDENT',
        performedBy: teacherUser._id,
        studentId: seededStudents[1]._id,
        studentName: seededStudents[1].name,
        details: 'Diya Patel registered by Teacher',
        createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
      },
    ]);

    console.log('Database Seeding Completed Successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
