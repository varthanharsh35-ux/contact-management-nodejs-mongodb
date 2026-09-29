const express = require('express');
const Contact = require('./models/Contact');
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));

function validateBody(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length) {
    return res.status(400).json({ error: 'A non-empty JSON object is required' });
  }
  const allowed = ['contactId', 'name', 'phone', 'email'];
  for (const [key, value] of Object.entries(body)) {
    if (!allowed.includes(key)) return res.status(400).json({ error: `Unknown field: ${key}` });
    if (typeof value !== 'string' || !value.trim()) {
      return res.status(400).json({ error: `${key} must be a non-empty string` });
    }
  }
  next();
}

app.get('/', (req, res) => res.json({ message: 'Contact Management API', contacts: '/contacts' }));
app.post('/contacts', validateBody, async (req, res) => {
  const contact = await Contact.create(req.body);
  res.location(`/contacts/${encodeURIComponent(contact.contactId)}`).status(201).json(contact);
});
app.get('/contacts', async (req, res) => {
  res.json(await Contact.find().sort({ createdAt: -1, _id: -1 }));
});
app.get('/contacts/:id', async (req, res) => {
  const contact = await Contact.findOne({ contactId: req.params.id });
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json(contact);
});
app.put('/contacts/:id', validateBody, async (req, res) => {
  if (req.body.contactId !== undefined && req.body.contactId !== req.params.id) {
    return res.status(400).json({ error: 'contactId cannot be changed' });
  }
  const contact = await Contact.findOneAndUpdate(
    { contactId: req.params.id }, { $set: req.body }, { new: true, runValidators: true }
  );
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json(contact);
});
app.delete('/contacts/:id', async (req, res) => {
  const contact = await Contact.findOneAndDelete({ contactId: req.params.id });
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json({ message: 'Contact deleted successfully', contactId: contact.contactId });
});
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'contactId or email';
    return res.status(409).json({ error: `${field} already exists` });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: Object.values(err.errors).map(e => e.message) });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large' });
  console.error('Request failed:', err.name);
  res.status(500).json({ error: 'Internal server error' });
});
module.exports = app;
