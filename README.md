# Contact Management System

UNIT 3 assignment: a REST API built with Node.js, Express.js, MongoDB and Mongoose. Supports creating, listing, retrieving, updating and deleting personal or professional contacts.

## Setup

Requirements: Node.js 22 or newer, npm, and either a local MongoDB server or a MongoDB Atlas database.

1. Clone this repository and open its folder in a terminal.
2. Run `npm ci` to install dependencies from the lockfile.
3. Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell, or `cp .env.example .env` on macOS/Linux).
4. Set `MONGODB_URI` in `.env`. The default is `mongodb://127.0.0.1:27017/contact_management`. For Atlas, use your own connection string, database user and network access settings. Never commit `.env`.
5. Start your local MongoDB service if using the default URI.
6. Run `npm run dev` during development, or `npm start` for a normal run.

The API is available at `http://localhost:3000`. `PORT` defaults to 3000. The application explicitly selects the database **contact_management**, even if a different database appears in the URI. Startup waits for the database and unique indexes before serving requests.

## Contact fields

| Field | Rules |
| --- | --- |
| `contactId` | Unique string. Generated as a UUID if omitted. Supplied IDs may contain letters, digits, underscores and hyphens. Cannot be changed after creation. |
| `name` | Required non-empty string; surrounding whitespace is removed. |
| `phone` | Required string containing exactly 10 ASCII digits. Send it in quotes to preserve leading zeroes. |
| `email` | Optional; if supplied, must be a non-empty valid-format email. Trimmed and lowercased, with a unique database index. |

Email is optional because the assignment explicitly marks only name and phone as required. Multiple contacts may omit email. MongoDB also adds `_id`, and Mongoose adds `createdAt` and `updatedAt` timestamps. Unknown fields, numeric phone values, null values and empty request objects are rejected.

## API endpoints

All request bodies use `Content-Type: application/json`. **`:id` means the public `contactId`, not MongoDB's `_id`.**

| Method | Endpoint | Purpose | Success |
| --- | --- | --- | --- |
| POST | `/contacts` | Create a contact | 201 |
| GET | `/contacts` | List all contacts, newest first | 200 |
| GET | `/contacts/:id` | Fetch one contact | 200 |
| PUT | `/contacts/:id` | Update supplied fields; omitted fields stay unchanged | 200 |
| DELETE | `/contacts/:id` | Delete a contact | 200 |

### Create

`POST /contacts`

```json
{
  "contactId": "C001",
  "name": "Asha Kumar",
  "phone": "9876543210",
  "email": "asha@example.com"
}
```

Example response (201; generated metadata varies):

```json
{
  "_id": "66f900000000000000000001",
  "contactId": "C001",
  "name": "Asha Kumar",
  "phone": "9876543210",
  "email": "asha@example.com",
  "createdAt": "2026-09-29T06:00:00.000Z",
  "updatedAt": "2026-09-29T06:00:00.000Z"
}
```

### Read

`GET /contacts/C001` returns the contact object above. `GET /contacts` returns an array of those objects, or `[]` when the database is empty.

### Update

`PUT /contacts/C001`

```json
{ "name": "Asha Rao", "phone": "0123456789" }
```

Returns the complete updated contact (200), with the changed name, phone and `updatedAt`. Validation and unique indexes apply to updates too.

### Delete

`DELETE /contacts/C001` returns (200):

```json
{ "message": "Contact deleted successfully", "contactId": "C001" }
```

## Error handling

| Status | Meaning | Example response |
| --- | --- | --- |
| 400 | Invalid fields, malformed JSON or invalid update | `{"error":"Validation failed","details":["phone must contain exactly 10 digits"]}` |
| 404 | Missing contact or route | `{"error":"Contact not found"}` |
| 409 | Duplicate contactId or normalized email | `{"error":"email already exists"}` |
| 413 | Body exceeds 16 KB | `{"error":"Request body is too large"}` |
| 500 | Unexpected server error | `{"error":"Internal server error"}` |

Database indexes enforce uniqueness, including concurrent writes. Error responses do not expose database credentials or stack traces.

## Testing with Postman

1. Start the application with a running MongoDB database.
2. Import `postman/Contact-Management.postman_collection.json` into Postman.
3. Set collection variable `baseUrl` to `http://localhost:3000` if needed.
4. Run the entire collection in order using Collection Runner.

The collection creates a uniquely named test contact, exercises every CRUD endpoint, checks validation and duplicate errors, and deletes its test record. It contains response assertions. The same collection can run automatically using Postman's Newman runner:

```sh
npm run test:postman
```

Run integration tests with:

```sh
npm test
```

Both automated commands start an isolated real MongoDB process using `mongodb-memory-server`, and stop it afterward. They do not use or clear your configured database. The first run downloads a MongoDB binary and requires internet access. Integration tests cover CRUD persistence, unique indexes, missing contacts, optional email, generated IDs, invalid create/update values, malformed JSON, unknown fields and body size limits. GitHub Actions runs both test commands on pushes and pull requests.

## Project structure

```text
src/
  app.js                 Express endpoints and error handling
  db.js                  Mongoose connection and index initialization
  server.js              Environment configuration and HTTP startup
  models/Contact.js      Contact schema and model
test/contacts.test.js    Integration tests
scripts/test-postman.js  Isolated Postman collection runner
postman/                Importable Postman collection
.env.example            Configuration template
```

This is an assignment API intended for local testing. It has no user accounts or authentication; use fictional contacts during demonstrations. A hosted deployment is not required for the GitHub submission.
