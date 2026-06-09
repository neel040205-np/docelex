require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

const runMigration = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://neelpatelnp0402_db_user:Neel0402%23%40@docelex.1x1y2lf.mongodb.net/?appName=docelex';
    console.log('Connecting to database...');
    const conn = await mongoose.connect(mongoURI);
    console.log(`Database connected: ${conn.connection.host}`);

    const db = conn.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log(`Found ${collections.length} collections. Checking for student collections...`);

    for (const colInfo of collections) {
      const colName = colInfo.name;
      if (colName === 'students' || colName.startsWith('students_')) {
        console.log(`Checking indexes for collection: ${colName}`);
        const collection = db.collection(colName);
        const indexes = await collection.indexes();
        
        const hasIndex = indexes.some(idx => idx.name === 'srNumber_1');
        if (hasIndex) {
          try {
            await collection.dropIndex('srNumber_1');
            console.log(`  Successfully dropped 'srNumber_1' unique index from collection: ${colName}`);
          } catch (dropErr) {
            console.error(`  Error dropping index 'srNumber_1' from ${colName}:`, dropErr.message);
          }
        } else {
          console.log(`  No 'srNumber_1' index found on ${colName}.`);
        }
      }
    }

    console.log('Database migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
