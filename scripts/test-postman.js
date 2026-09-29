const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const newman = require('newman');
const app = require('../src/app');
const { connectDatabase } = require('../src/db');

(async () => {
  let mongo, server;
  try {
    mongo = await MongoMemoryServer.create();
    await connectDatabase(mongo.getUri());
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    await new Promise((resolve, reject) => newman.run({
      collection: require('../postman/Contact-Management.postman_collection.json'),
      envVar: [{ key: 'baseUrl', value: `http://127.0.0.1:${server.address().port}` }],
      reporters: ['cli']
    }, (err, summary) => {
      if (err || summary.run.failures.length) reject(err || new Error('Postman assertions failed'));
      else resolve();
    }));
  } catch (err) { console.error(err.message); process.exitCode = 1; }
  finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  }
})();
