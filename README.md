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

## RESTful event CRUD

For the assignment, the event API deliberately has no authentication. **Anyone who can access the server can create, edit or remove events through this API**; this is suitable only for a controlled course demonstration, not deployment as a real student service. Replace this design with proper API authorization before handling real data.

- `GET /api/events` lists active events. Optional `search` and `category` query parameters filter by name and category.
- `POST /api/events` creates an event.
- `PUT /api/events/:id` replaces the editable event fields.
- `DELETE /api/events/:id` removes an event from listings.

Example (replace the ID with the `_id` returned by POST):

```sh
curl 'http://localhost:3000/api/events?search=workshop'
curl -X POST http://localhost:3000/api/events -H 'Content-Type: application/json' -d '{"name":"Skills Workshop","description":"Practice new skills","date":"2030-04-01T10:00:00+08:00","deadline":"2030-03-31T10:00:00+08:00","location":"HKMU","category":"Future Skills & Intelligence","capacity":20,"hours":2}'
curl -X PUT http://localhost:3000/api/events/REPLACE_ID -H 'Content-Type: application/json' -d '{"name":"Skills Workshop Updated","description":"Practice new skills","date":"2030-04-01T10:00:00+08:00","deadline":"2030-03-31T10:00:00+08:00","location":"HKMU","category":"Future Skills & Intelligence","capacity":25,"hours":2}'
curl -X DELETE http://localhost:3000/api/events/REPLACE_ID
```


## Limitations and verification

Capacity and waitlist operations use separate database queries, so simultaneous requests can race. The application needs atomic reservation/transaction handling and further security hardening before real-world use. OAuth sign-in and cloud deployment need external configuration and must be verified in the target environment.

The repository currently defines `npm start` but no automated test script. Validate the intended student and SAO workflows against a suitable test database. Use disposable data for CRUD demonstrations.
