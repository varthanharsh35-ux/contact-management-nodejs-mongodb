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

// Email is optional; enforce uniqueness only for contacts that provide it.
contactSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
module.exports = mongoose.model('Contact', contactSchema);
