require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const { connectDatabase } = require('./db');

async function start() {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
  await connectDatabase(process.env.MONGODB_URI);
  const server = app.listen(port, () => console.log(`Contact API running at http://localhost:${port}`));
  server.on('error', async err => {
    console.error('HTTP server failed:', err.code);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
    server.close(async () => { await mongoose.disconnect(); process.exit(0); });
  });
}
start().catch(async err => {
  console.error('Startup failed:', err.name === 'MongooseServerSelectionError' ? 'Unable to connect to MongoDB. Check MONGODB_URI and database availability.' : err.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
