const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../src/app');
const { connectDatabase } = require('../src/db');
let mongo;
before(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
}, { timeout: 180000 });
after(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });
const contact = { contactId: 'C001', name: 'Asha Kumar', phone: '9876543210', email: 'asha@example.com' };

test('CRUD lifecycle persists changes and deletes the contact', async () => {
  const created = await request(app).post('/contacts').send(contact).expect(201);
  assert.equal(created.body.contactId, 'C001');
  assert.equal(created.headers.location, '/contacts/C001');
  const all = await request(app).get('/contacts').expect(200);
  assert.ok(all.body.some(c => c.contactId === 'C001'));
  const fetched = await request(app).get('/contacts/C001').expect(200);
  assert.equal(fetched.body.email, contact.email);
  await request(app).put('/contacts/C001').send({ name: 'Asha Rao', phone: '0123456789' }).expect(200);
  const updated = await request(app).get('/contacts/C001').expect(200);
  assert.equal(updated.body.name, 'Asha Rao');
  assert.equal(updated.body.phone, '0123456789');
  await request(app).delete('/contacts/C001').expect(200);
  await request(app).get('/contacts/C001').expect(404);
});
test('unique ID and normalized email are enforced by MongoDB indexes', async () => {
  await request(app).post('/contacts').send(contact).expect(201);
  await request(app).post('/contacts').send({ ...contact, email: 'another@example.com' }).expect(409);
  await request(app).post('/contacts').send({ ...contact, contactId: 'C002', email: 'ASHA@example.com' }).expect(409);
  await request(app).post('/contacts').send({ ...contact, contactId: 'C003', email: 'third@example.com' }).expect(201);
  await request(app).put('/contacts/C003').send({ email: contact.email }).expect(409);
});
test('required fields and phone/email formats are validated on create and update', async () => {
  for (const body of [
    { phone: '9876543210' }, { name: 'Asha' },
    { name: 'Asha', phone: '123' }, { name: 'Asha', phone: 'abcdefghij' },
    { name: 'Asha', phone: 9876543210 },
    { name: 'Asha', phone: '9876543210', email: 'invalid' },
    { name: ' ', phone: '9876543210' }, { name: null, phone: '9876543210' },
    { name: 'Asha', phone: '9876543210', contactId: 'bad/id' }
  ]) await request(app).post('/contacts').send(body).expect(400);
  for (const body of [{ phone: '12' }, { email: 'bad' }, { name: '' }, { contactId: 'changed' }]) {
    await request(app).put('/contacts/C001').send(body).expect(400);
  }
  const unchanged = await request(app).get('/contacts/C001').expect(200);
  assert.equal(unchanged.body.phone, contact.phone);
});
test('optional email and generated unique IDs work for multiple contacts', async () => {
  const first = await request(app).post('/contacts').send({ name: 'One', phone: '1234567890' }).expect(201);
  const second = await request(app).post('/contacts').send({ name: 'Two', phone: '1234567890' }).expect(201);
  assert.notEqual(first.body.contactId, second.body.contactId);
});
test('missing contacts, unknown fields, malformed JSON and oversized bodies are handled', async () => {
  await request(app).get('/contacts/missing').expect(404);
  await request(app).put('/contacts/missing').send({ name: 'Test' }).expect(404);
  await request(app).delete('/contacts/missing').expect(404);
  await request(app).get('/unknown').expect(404);
  for (const body of [{}, [], { $set: { name: 'X' } }, { ...contact, admin: true }]) {
    await request(app).post('/contacts').send(body).expect(400);
  }
  await request(app).post('/contacts').set('Content-Type', 'application/json').send('{bad').expect(400);
  await request(app).post('/contacts').send({ name: 'x'.repeat(20000) }).expect(413);
});
