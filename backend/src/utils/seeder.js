require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const { getStudentModel, getAuditLogModel } = require('./dynamicModels');

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
    srNumber: 'SR10001',
    grNumber: 'GR10001',
    surname: 'Sharma',
    firstName: 'Aarav',
    fatherName: 'Rajesh',
    motherName: 'Sunita',
    gender: 'Male',
    dob: new Date('2016-04-12'),
    admissionDate: new Date('2021-06-15'),
    caste: 'Brahmin',
    casteCategory: 'General',
    aadhaarNumber: '123456789012',
    nameAsPerAadhaar: 'Sharma Aarav Rajesh',
    dobAsPerAadhaar: new Date('2016-04-12'),
    bankAccountNumber: '98765432101',
    ifscCode: 'SBIN0001234',
    accountHolderName: 'Sharma Aarav Rajesh',
    mobileNumber1: '9876543210',
    class: 'Class 5',
    division: 'A',
    createdBy: teacherId,
    updatedBy: teacherId,
    documents: {},
  },
  {
    srNumber: 'SR10002',
    grNumber: 'GR10002',
    surname: 'Patel',
    firstName: 'Diya',
    fatherName: 'Amit',
    motherName: 'Meena',
    gender: 'Female',
    dob: new Date('2015-08-23'),
    admissionDate: new Date('2020-06-15'),
    caste: 'Patel',
    casteCategory: 'General',
    aadhaarNumber: '234567890123',
    nameAsPerAadhaar: 'Patel Diya Amit',
    dobAsPerAadhaar: new Date('2015-08-23'),
    bankAccountNumber: '98765432102',
    ifscCode: 'BARB0BARDOL',
    accountHolderName: 'Patel Diya Amit',
    mobileNumber1: '9823456789',
    class: 'Class 6',
    division: 'B',
    createdBy: teacherId,
    updatedBy: teacherId,
    documents: {},
  },
  {
    srNumber: 'SR10003',
    grNumber: 'GR10003',
    surname: 'Mehta',
    firstName: 'Kabir',
    fatherName: 'Sanjay',
    motherName: 'Ritu',
    gender: 'Male',
    dob: new Date('2016-11-05'),
    admissionDate: new Date('2021-06-15'),
    caste: 'Mehta',
    casteCategory: 'General',
    aadhaarNumber: '345678901234',
    nameAsPerAadhaar: 'Mehta Kabir Sanjay',
    dobAsPerAadhaar: new Date('2016-11-05'),
    bankAccountNumber: '98765432103',
    ifscCode: 'ICIC0000123',
    accountHolderName: 'Mehta Kabir Sanjay',
    mobileNumber1: '9988776655',
    class: 'Class 5',
    division: 'A',
    createdBy: teacherId,
    updatedBy: teacherId,
    documents: {},
  },
  {
    srNumber: 'SR10004',
    grNumber: 'GR10004',
    surname: 'Iyer',
    firstName: 'Ananya',
    fatherName: 'Raman',
    motherName: 'Lakshmi',
    gender: 'Female',
    dob: new Date('2013-02-14'),
    admissionDate: new Date('2018-06-15'),
    caste: 'Iyer',
    casteCategory: 'General',
    aadhaarNumber: '456789012345',
    nameAsPerAadhaar: 'Iyer Ananya Raman',
    dobAsPerAadhaar: new Date('2013-02-14'),
    bankAccountNumber: '98765432104',
    ifscCode: 'HDFC0000456',
    accountHolderName: 'Iyer Ananya Raman',
    mobileNumber1: '9765432109',
    class: 'Class 8',
    division: 'C',
    createdBy: teacherId,
    updatedBy: teacherId,
    documents: {},
  },
  {
    srNumber: 'SR10005',
    grNumber: 'GR10005',
    surname: 'Deshmukh',
    firstName: 'Rohan',
    fatherName: 'Milind',
    motherName: 'Sheetal',
    gender: 'Male',
    dob: new Date('2014-06-30'),
    admissionDate: new Date('2019-06-15'),
    caste: 'Maratha',
    casteCategory: 'General',
    aadhaarNumber: '567890123456',
    nameAsPerAadhaar: 'Deshmukh Rohan Milind',
    dobAsPerAadhaar: new Date('2014-06-30'),
    bankAccountNumber: '98765432105',
    ifscCode: 'MAHB0000789',
    accountHolderName: 'Deshmukh Rohan Milind',
    mobileNumber1: '9012345678',
    class: 'Class 7',
    division: 'B',
    createdBy: teacherId,
    updatedBy: teacherId,
    documents: {},
  },
  {
    srNumber: 'SR10006',
    grNumber: 'GR10006',
    surname: 'Verma',
    firstName: 'Ishaan',
    fatherName: 'Vikas',
    motherName: 'Priya',
    gender: 'Male',
    dob: new Date('2016-01-20'),
    admissionDate: new Date('2021-06-15'),
    caste: 'Verma',
    casteCategory: 'OBC',
    aadhaarNumber: '678901234567',
    nameAsPerAadhaar: 'Verma Ishaan Vikas',
    dobAsPerAadhaar: new Date('2016-01-20'),
    bankAccountNumber: '98765432106',
    ifscCode: 'PUNB0000999',
    accountHolderName: 'Verma Ishaan Vikas',
    mobileNumber1: '9123456780',
    class: 'Class 5',
    division: 'B',
    createdBy: teacherId,
    updatedBy: teacherId,
    documents: {},
  },
  {
    srNumber: 'SR10007',
    grNumber: 'GR10007',
    surname: 'Gupta',
    firstName: 'Sanya',
    fatherName: 'Nitin',
    motherName: 'Komal',
    gender: 'Female',
    dob: new Date('2015-10-02'),
    admissionDate: new Date('2020-06-15'),
    caste: 'Baniya',
    casteCategory: 'General',
    aadhaarNumber: '789012345678',
    nameAsPerAadhaar: 'Gupta Sanya Nitin',
    dobAsPerAadhaar: new Date('2015-10-02'),
    bankAccountNumber: '98765432107',
    ifscCode: 'BARB0CHALTH',
    accountHolderName: 'Gupta Sanya Nitin',
    mobileNumber1: '9234567891',
    class: 'Class 6',
    division: 'A',
    createdBy: teacherId,
    updatedBy: teacherId,
    documents: {},
  },
  {
    srNumber: 'SR10008',
    grNumber: 'GR10008',
    surname: 'Joshi',
    firstName: 'Vivaan',
    fatherName: 'Deepak',
    motherName: 'Alpa',
    gender: 'Male',
    dob: new Date('2013-12-25'),
    admissionDate: new Date('2018-06-15'),
    caste: 'Brahmin',
    casteCategory: 'General',
    aadhaarNumber: '890123456789',
    nameAsPerAadhaar: 'Joshi Vivaan Deepak',
    dobAsPerAadhaar: new Date('2013-12-25'),
    bankAccountNumber: '98765432108',
    ifscCode: 'SBIN0000888',
    accountHolderName: 'Joshi Vivaan Deepak',
    mobileNumber1: '9345678912',
    class: 'Class 8',
    division: 'A',
    createdBy: teacherId,
    updatedBy: teacherId,
    documents: {},
  },
  {
    srNumber: 'SR10009',
    grNumber: 'GR10009',
    surname: 'Nair',
    firstName: 'Meera',
    fatherName: 'Balakrishnan',
    motherName: 'Radha',
    gender: 'Female',
    dob: new Date('2014-03-09'),
    admissionDate: new Date('2019-06-15'),
    caste: 'Nair',
    casteCategory: 'General',
    aadhaarNumber: '901234567890',
    nameAsPerAadhaar: 'Nair Meera Balakrishnan',
    dobAsPerAadhaar: new Date('2014-03-09'),
    bankAccountNumber: '98765432109',
    ifscCode: 'SBIN0000999',
    accountHolderName: 'Nair Meera Balakrishnan',
    mobileNumber1: '9456789123',
    class: 'Class 7',
    division: 'A',
    createdBy: teacherId,
    updatedBy: teacherId,
    documents: {},
  },
  {
    srNumber: 'SR10010',
    grNumber: 'GR10010',
    surname: 'Sen',
    firstName: 'Aditya',
    fatherName: 'Arup',
    motherName: 'Moushumi',
    gender: 'Male',
    dob: new Date('2012-07-18'),
    admissionDate: new Date('2017-06-15'),
    caste: 'Kayastha',
    casteCategory: 'General',
    aadhaarNumber: '012345678901',
    nameAsPerAadhaar: 'Sen Aditya Arup',
    dobAsPerAadhaar: new Date('2012-07-18'),
    bankAccountNumber: '98765432110',
    ifscCode: 'UTIB0000111',
    accountHolderName: 'Sen Aditya Arup',
    mobileNumber1: '9567891234',
    class: 'Class 9',
    division: 'A',
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

    // Drop dynamic collections to start fresh
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const coll of collections) {
      if (
        coll.name.startsWith('students_') || 
        coll.name.startsWith('documents_') || 
        coll.name.startsWith('auditlogs_') ||
        coll.name === 'students' ||
        coll.name === 'documents' ||
        coll.name === 'auditlogs'
      ) {
        console.log(`Dropping collection: ${coll.name}`);
        await mongoose.connection.db.dropCollection(coll.name);
      }
    }

    console.log('Seeding teacher accounts...');
    const teacherUser = await User.create({
      name: 'Neel', email: 'teacher@docneel.com', password: 'Neel@1234', role: 'teacher'
    });

    const additionalTeachers = [
      { name: 'Hitendra', email: 'teacher@dochitendra.com', password: 'Hitendra@1234', role: 'teacher' },
      { name: 'Anila', email: 'teacher@docanila.com', password: 'Anila@1234', role: 'teacher' },
      { name: 'Elex', email: 'teacher@docElex.com', password: 'Elex@1234', role: 'teacher' },
      { name: 'Rajesh', email: 'teacher@docrajesh.com', password: 'Rajesh@1234', role: 'teacher' },
      { name: 'Sunita', email: 'teacher@docsunita.com', password: 'Sunita@1234', role: 'teacher' },
      { name: 'Amit', email: 'teacher@docamit.com', password: 'Amit@1234', role: 'teacher' },
      { name: 'Meena', email: 'teacher@docmeena.com', password: 'Meena@1234', role: 'teacher' },
      { name: 'Sanjay', email: 'teacher@docsanjay.com', password: 'Sanjay@1234', role: 'teacher' },
      { name: 'Ritu', email: 'teacher@docritu.com', password: 'Ritu@1234', role: 'teacher' },
      { name: 'Raman', email: 'teacher@docraman.com', password: 'Raman@1234', role: 'teacher' }
      
    ];

    await User.create(additionalTeachers);

    console.log(`Seeded Users:`);
    console.log(`- Default: teacher@docelex.com / Elex@1234`);
    console.log(`- Hitendra: teacher@dochitendra.com / Hitendra@1234`);
    console.log(`- Anila: teacher@docanila.com / Anila@1234`);
    console.log(`- Neel: teacher@docneel.com / Neel@1234`);

    // Get dynamic models for teacherUser
    const StudentModel = getStudentModel(teacherUser._id);
    const AuditLogModel = getAuditLogModel(teacherUser._id);

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
    const seededStudents = await StudentModel.create(studentsData);
    console.log(`Successfully seeded ${seededStudents.length} mock student records.`);

    // Write some initial Audit Logs
    console.log('Writing default audit logs...');
    await AuditLogModel.create([
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
