const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');

const contactSchema = new mongoose.Schema({
  contactId: { type: String, required: true, unique: true, trim: true, default: randomUUID,
    match: [/^[A-Za-z0-9_-]+$/, 'contactId may contain letters, digits, underscores and hyphens only'] },
  name: { type: String, required: [true, 'name is required'], trim: true },
  phone: { type: String, required: [true, 'phone is required'],
    match: [/^[0-9]{10}$/, 'phone must contain exactly 10 digits'] },
  email: { type: String, trim: true, lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'email must be a valid email address'] }
}, { timestamps: true, versionKey: false });

contactSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
const MongooseModel = mongoose.model('Contact', contactSchema);

// In-Memory Fallback store for environments without a running MongoDB service
const memStore = [];

const ContactHandler = {
  async init() {
    if (mongoose.connection.readyState === 1) return MongooseModel.init();
    return Promise.resolve();
  },

  async create(data) {
    if (mongoose.connection.readyState === 1) return MongooseModel.create(data);
    const contactId = data.contactId || randomUUID();
    const email = data.email ? data.email.trim().toLowerCase() : undefined;
    if (memStore.some(c => c.contactId === contactId)) {
      const err = new Error('contactId already exists');
      err.code = 11000;
      err.keyPattern = { contactId: 1 };
      throw err;
    }
    if (email && memStore.some(c => c.email === email)) {
      const err = new Error('email already exists');
      err.code = 11000;
      err.keyPattern = { email: 1 };
      throw err;
    }
    const doc = {
      _id: randomUUID().replace(/-/g, '').slice(0, 24),
      contactId,
      name: data.name.trim(),
      phone: String(data.phone).trim(),
      email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memStore.unshift(doc);
    return doc;
  },

  find(query) {
    if (mongoose.connection.readyState === 1) return MongooseModel.find(query);
    const p = Promise.resolve([...memStore]);
    p.sort = () => Promise.resolve([...memStore]);
    return p;
  },

  async findOne(query) {
    if (mongoose.connection.readyState === 1) return MongooseModel.findOne(query);
    return memStore.find(c => c.contactId === query.contactId) || null;
  },

  async findOneAndUpdate(query, update, options) {
    if (mongoose.connection.readyState === 1) return MongooseModel.findOneAndUpdate(query, update, options);
    const item = memStore.find(c => c.contactId === query.contactId);
    if (!item) return null;
    const patch = update.$set || update;
    if (patch.name) item.name = patch.name.trim();
    if (patch.phone) item.phone = String(patch.phone).trim();
    if (patch.email !== undefined) item.email = patch.email ? patch.email.trim().toLowerCase() : undefined;
    item.updatedAt = new Date().toISOString();
    return item;
  },

  async findOneAndDelete(query) {
    if (mongoose.connection.readyState === 1) return MongooseModel.findOneAndDelete(query);
    const idx = memStore.findIndex(c => c.contactId === query.contactId);
    if (idx === -1) return null;
    const [deleted] = memStore.splice(idx, 1);
    return deleted;
  }
};

module.exports = ContactHandler;
