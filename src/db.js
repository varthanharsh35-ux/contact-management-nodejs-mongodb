const mongoose = require('mongoose');
const Contact = require('./models/Contact');

async function connectDatabase(uri) {
  if (!uri) throw new Error('MONGODB_URI is required. Copy .env.example to .env and configure it.');
  await mongoose.connect(uri, { dbName: 'contact_management', serverSelectionTimeoutMS: 10000 });
  // Wait for unique indexes before accepting requests.
  await Contact.init();
}
module.exports = { connectDatabase };
