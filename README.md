# Metro Faith Remake — COMP3810SEF Group 88

Repository: https://github.com/bobo-1024-AA/COMP3810SEF_Group88

## Project information

**Metro FAITH** is a server-side course project that helps students discover activities, register and track their engagement across five categories. SAO staff can manage activities, student records and statistics. This is a student project, not an official HKMU service. The project goals and levels are separate from official award criteria.

- **Project name:** Metro Faith Remake
- **Group:** 88
- **Live application:** https://comp3810sef-group88.onrender.com

| Member | Student ID |
| --- | --- |
| KWOK Yiu Po | 13487029 |
| LI Chak Fai | 13428853 |
| Cai Zhiqing | 13420369 |
| Tse Yuen Tung | 13496260 |
| HU Tianle | 13357905 |
| CHEN Zihan | 13484353 |

**Division of work:** To be completed by the group.

## Project files and technologies

- [`server.js`](server.js): Express configuration, MongoDB schemas, authentication, student and SAO routes, and the REST API. The `User`, `Event` and `Registration` schemas are defined here.
- [`views/`](views/): EJS templates for login, registration, student pages, event management, records and statistics.
- [`public/`](public/): CSS, logos and other static assets.
- [`package.json`](package.json) and [`package-lock.json`](package-lock.json): Dependencies, Node requirement and the start script.
- [`.env.example`](.env.example): Configuration template. Keep actual credentials in an untracked `.env` or hosting environment settings.

### Dependencies

| Package | Purpose |
| --- | --- |
| [express](https://www.npmjs.com/package/express) | Web server, routing and request handling |
| [ejs](https://www.npmjs.com/package/ejs) | Server-rendered HTML templates |
| [mongoose](https://www.npmjs.com/package/mongoose) | MongoDB schemas and queries |
| [express-session](https://www.npmjs.com/package/express-session) and [connect-mongo](https://www.npmjs.com/package/connect-mongo) | Sessions stored in MongoDB |
| [bcryptjs](https://www.npmjs.com/package/bcryptjs) | Password hashing and verification |
| [dotenv](https://www.npmjs.com/package/dotenv) | Loading local environment variables |
| [multer](https://www.npmjs.com/package/multer) | Event image uploads |

Google and GitHub OAuth are implemented using application routes; Passport is not a dependency.

## How to start

### Local development

**Prerequisites:** Node.js 20 or later, npm and a running MongoDB database. MongoDB Atlas may also be used.

1. Clone the repository and enter the project directory:

   ```sh
   git clone https://github.com/bobo-1024-AA/COMP3810SEF_Group88.git
   cd COMP3810SEF_Group88
   ```

2. Install the locked dependencies and create a local configuration:

   ```sh
   npm ci
   cp .env.example .env
   ```

3. Edit `.env`: set `MONGODB_URI`, a strong unique `SESSION_SECRET`, and `SAO_EMAIL` / `SAO_PASSWORD` for the administrator. The default `PORT` is 3000. Never commit or share credentials.
4. Start the application with `npm start` and open `http://localhost:3000`.

The server creates the SAO account only if its email does not already exist. Changing `SAO_PASSWORD` later does not reset an existing account. Do not use the example credentials for deployment.

### Cloud deployment

For a Render Node web service, use `npm ci` as the build command and `npm start` as the start command. Configure the variables above in Render, set `NODE_ENV=production` for secure session cookies, and configure MongoDB Atlas access if using Atlas. A deployment requires your own accounts and must be verified in the target environment.

### Optional OAuth

### Google sign-in

Create a Google OAuth web application, configure its consent screen, and add `https://your-app.example.com/auth/google/callback` as an authorized redirect URI (replace the origin with your app URL). Set `APP_BASE_URL`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the hosting platform; do not commit real credentials. Google sign-in creates a student account for a new Google identity. Existing accounts are not automatically linked; use their original sign-in method. Email/password registrations do not verify email addresses. Google sign-in requires Google to report a verified email.

### GitHub sign-in

Create a GitHub OAuth App and set its authorization callback URL to `https://your-app.example.com/auth/github/callback` (replace the origin with your app URL). Set `APP_BASE_URL`, `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in the environment; never commit credentials. The button appears when all three are configured. GitHub sign-in creates a student account and requires a verified primary GitHub email. Existing accounts are not automatically linked; use their original sign-in method. Live sign-in requires GitHub access and valid OAuth App credentials.


## Operation guide

### Login and registration

- Open `/register` to create a student account with name, email and a password of at least eight characters; sign in at `/login`.
- Google and GitHub buttons appear when their respective OAuth settings are configured. Existing accounts are not automatically linked to OAuth identities.
- Use **Log out** to end the session. Email/password registration does not verify email addresses.

### Student: events and registration

1. Open **Events** to browse activities. Search by name and filter by category and registration availability. The default view shows activities open for registration.
2. Select **Register** before the deadline. A registration is pending SAO confirmation; if the event is full it enters a first-come waitlist.
3. In **My Records**, view registration history and cancel an eligible pending, confirmed or waitlisted registration before the event. When a place is released, the earliest waitlisted student can be promoted to pending.
4. After an activity begins, SAO can mark a confirmed registration completed. Completed records contribute to progress; removed activities retain their registration history.

### Student: progress and levels

The five categories are Future Skills & Intelligence, Aesthetics & Spirituality, Igniting & Sports, Temperance & Justice, and Humanity & Love. My Records shows completed hours and activity counts against the project's five-hour and five-activity goals for each category.

| Level | Project rule based on completed hours |
| --- | --- |
| Beginning | At least one category has fewer than 3 hours |
| Accomplishing | At least 3 hours in every category, but not Mastering |
| Mastering | At least 5 hours in every category |

### SAO: events, records and statistics

- **SAO dashboard:** Search activities by name, create or edit events, and remove them from listings while preserving history. Event forms use Hong Kong time. Images may be JPG, PNG or WebP, up to 2 MB, and are stored in MongoDB.
- **Student records** beside an event: search and add students, update status, or delete a record. Cancelled records can be restored; other existing records are skipped. Deleting a completed record removes its contribution to progress.
- **Student activity records:** search across students and activities, filter by status and update records, including cancelled records and removed events. Completed status requires that the event has started; capacity rules apply to pending and confirmed records. Releasing a place can promote a waitlisted student.
- **Statistics:** view student counts by level, the top five students by completed hours in each category, and the top 20 Mastering students by total completed hours. Removed activities with completed records are included; ties are ordered by name and email.

## RESTful CRUD Services

The application provides an event API for the course assignment. These endpoints do **not** require login: anyone who can reach the server can create, change or remove events. Use them only in a controlled demonstration environment; authorization must be added before handling real student data.

| Operation | Method | Path | Success |
| --- | --- | --- | --- |
| Create | `POST` | `/api/events` | `201 Created`, event JSON |
| Read | `GET` | `/api/events` | `200 OK`, array of active events |
| Update | `PUT` | `/api/events/:id` | `200 OK`, updated event JSON |
| Delete | `DELETE` | `/api/events/:id` | `204 No Content` |

The examples use a local server and disposable data. For a controlled cloud demonstration, replace `http://localhost:3000` with `https://comp3810sef-group88.onrender.com`. **POST, PUT and DELETE change the selected database**; do not use them against shared data without coordinating with its owners. `curl -i` shows the HTTP status and headers.

### Event fields

Both POST and PUT require all of the following JSON fields. PUT replaces these editable fields; it is not a partial update.

| Field | Description |
| --- | --- |
| `name`, `description`, `location` | Non-empty text |
| `category` | One of the five exact category names listed in the progress section |
| `date` | Valid event date and time, e.g. ISO 8601 with a time-zone offset |
| `deadline` | Valid registration deadline, no later than `date` |
| `capacity` | Positive integer |
| `hours` | Number of engagement hours, at least 0.1 |

### Demo setup

Run these commands in the same Bash terminal, with the local application running and connected to a **test database**. Each block can be copied and pasted in order. `EVENT_ID` is populated automatically from the create response and used for update and delete.

```sh
BASE_URL='http://localhost:3000'
```

### 1. Create an event

**POST `/api/events`** — creates a new event and returns it as JSON with status `201`.

**HTTP Request Type:** POST

**Path URI:** `/api/events`

**Example Testing Command:**

```sh
EVENT_RESPONSE=$(curl -fsS -X POST "$BASE_URL/api/events" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Skills Workshop","description":"Practice new skills","date":"2030-04-01T10:00:00+08:00","deadline":"2030-03-31T10:00:00+08:00","location":"HKMU","category":"Future Skills & Intelligence","capacity":20,"hours":2}') && \
printf '%s\n' "$EVENT_RESPONSE" && \
EVENT_ID=$(printf '%s' "$EVENT_RESPONSE" | node -e "let s='';process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>{const id=JSON.parse(s)._id;if(!id)process.exit(1);process.stdout.write(id)})") && \
printf 'Event ID: %s\n' "$EVENT_ID"
```

Example response body (the generated ID varies; other MongoDB fields may be present):

```json
{"_id":"507f1f77bcf86cd799439011","name":"Skills Workshop","category":"Future Skills & Intelligence","capacity":20,"hours":2,"removed":false}
```

The command saves the returned `_id` in `EVENT_ID` for the update and delete examples. Invalid fields return `400`, for example `{"error":"Invalid event"}`.

### 2. Read events

**GET `/api/events`** — returns a JSON array of events that have not been removed. The optional `search` parameter matches the event name, and `category` filters by an exact category name. An unrecognized category is ignored. There is no single-event GET endpoint in this API.

**HTTP Request Type:** GET

**Path URI:** `/api/events`

**Example Testing Command:**

```sh
curl -i --get "$BASE_URL/api/events" --data-urlencode 'search=Skills Workshop'
```

To read the deployed application without changing its data:

```sh
curl -i -X GET 'https://comp3810sef-group88.onrender.com/api/events'
```

Example response body (abbreviated; actual event objects contain additional fields):

```json
[{"_id":"507f1f77bcf86cd799439011","name":"Skills Workshop","category":"Future Skills & Intelligence","capacity":20,"hours":2,"removed":false}]
```

No matching events returns `[]` with status `200`.

### 3. Update an event

**PUT `/api/events/:id`** — uses the ID saved during creation and requires all editable fields. The response is the updated event JSON with status `200`.

**HTTP Request Type:** PUT

**Path URI:** `/api/events/:id`

**Example Testing Command:**

```sh
curl -i -X PUT "$BASE_URL/api/events/$EVENT_ID" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Skills Workshop Updated","description":"Practice new skills","date":"2030-04-01T10:00:00+08:00","deadline":"2030-03-31T10:00:00+08:00","location":"HKMU","category":"Future Skills & Intelligence","capacity":25,"hours":2}'
```

**Sample response** (`200 OK`, abbreviated):

```json
{"_id":"507f1f77bcf86cd799439011","name":"Skills Workshop Updated","category":"Future Skills & Intelligence","capacity":25,"hours":2,"removed":false}
```

An invalid event returns `400`. Capacity cannot be set below the number of pending, confirmed and completed registrations; this returns `400` with `{"error":"Capacity is below registrations"}`. A valid but unavailable ID returns `404`.

### 4. Delete an event

**DELETE `/api/events/:id`** — uses the ID saved during creation.

**HTTP Request Type:** DELETE

**Path URI:** `/api/events/:id`

**Example Testing Command:**

```sh
curl -i -X DELETE "$BASE_URL/api/events/$EVENT_ID"
```

**Sample response:** `HTTP/1.1 204 No Content`, with no response body. Deletion marks the event as removed, hides it from active listings and preserves registration history. A valid but unavailable ID returns `404`. Use GET to verify the event no longer appears.

Malformed IDs and validation errors can return `400`; unexpected server errors return `500`. The examples are illustrative, not captured production data.

## Limitations and verification

Capacity and waitlist operations use separate database queries, so simultaneous requests can race. The application needs atomic reservation/transaction handling and further security hardening before real-world use. OAuth sign-in and cloud deployment need external configuration and must be verified in the target environment.

The repository currently defines `npm start` but no automated test script. Validate the intended student and SAO workflows against a suitable test database. Use disposable data for CRUD demonstrations.
