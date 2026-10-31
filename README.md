# Metro FAITH — Group 88

A server-side course project for students to discover Metro FAITH activities, register, and track progress. SAO staff can create and manage activities and confirm attendance. The five categories and examples are based on the supplied Metro FAITH overview. This is a student project, not an official HKMU service.

## Group information

- Group number: 88
- Members, student IDs, and division of work: **to be completed by the group**.

## Project files

- `server.js`: Express server, MongoDB models, authentication, event and registration routes, and REST API.
- `views/`: EJS pages for login, student activity, events, and SAO management.
- `public/`: stylesheets.
- `package.json` and `package-lock.json`: Node dependencies and scripts.
- `.env.example`: configuration template; never commit real credentials.

## Setup and operation

Requires Node.js 20 or later and a MongoDB database (MongoDB Atlas is suitable). Run `npm ci`, copy `.env.example` to `.env`, and set `MONGODB_URI`, `SESSION_SECRET`, `SAO_EMAIL` and `SAO_PASSWORD`. Choose a strong unique session secret and password. Run `npm start`, then open the server on port 3000. `PORT` can be supplied by the hosting platform. The server creates the SAO account only when its email does not already exist; changing the environment password later does not reset an existing account. Do not use the example credentials for a deployment.

For Render, create a Node web service with `npm ci` as the build command and `npm start` as the start command. Set the variables above in Render's environment settings and configure MongoDB Atlas network access and database credentials according to your deployment. Set `NODE_ENV=production` for secure session cookies. Do not commit or share database connection strings. Deploying and connecting Atlas require your own accounts.

### Microsoft sign-in

Register an application in Microsoft Entra, enable the `User.Read` delegated Microsoft Graph permission, and configure a web redirect URI ending in `/auth/microsoft/callback`. Set `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_CALLBACK_URL` (the full registered URI), and optionally `MICROSOFT_TENANT_ID` (default `common`). Configure the supported account types and tenant according to your institution. The sign-in button appears when all three required Microsoft variables are set. Microsoft sign-in creates a student account; existing email/password accounts are not automatically linked. Microsoft credentials and a reachable Microsoft identity service are required to test this flow.

### Student workflow

1. Create an account from the login page, or use Microsoft sign-in when configured. Log in to see the activities page.
2. Search by activity name or filter by category. Select **Register** before the deadline. Registrations are pending SAO confirmation; when capacity is full they enter a first-come waitlist.
3. Open **My activity** to view status and cancel a pending, confirmed, or waitlisted registration before the activity. When a place becomes free, the earliest waitlisted student moves to pending for SAO confirmation.
4. SAO can mark confirmed registrations completed after the event time. Completed activities count toward both goals in their category: 5 hours and 5 distinct activities. These project goals are separate from official award criteria.
5. Use **Log out** when finished.

### SAO workflow

Log in with the configured SAO account and open **SAO dashboard**. Use **Create event**, **Edit**, and **Remove** to manage events. Fill in the name, description, date and time, location, category, capacity, registration deadline, and hours. Optionally upload a JPG, PNG or WebP image (maximum 2 MB); it is stored in MongoDB and can be replaced or removed when editing. Times entered in the form are Hong Kong time. Use **Confirm** on pending registrations, then **Mark completed** after the event starts. Removal hides an event while preserving registration history. Increasing capacity promotes waitlisted students into pending places. Select **Student activity records** to search all students’ registrations, including cancelled registrations and removed events, and update a record’s status. A completed status requires that the event has started; statuses occupying a place cannot exceed event capacity. Releasing a place promotes the earliest waitlisted student for an upcoming active event.

### REST CRUD

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

Capacity and waitlist operations currently use separate database queries: simultaneous requests can race. This prototype needs atomic reservation/transaction handling and further security hardening before real-world use. OAuth sign-in and Atlas/Render deployment require external configuration and must be verified in the target environment.
