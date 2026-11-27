# Metro Faith 88 — COMP3810SEF Group 88

Repository: https://github.com/bobo-1024-AA/COMP3810SEF_Group88

## Official Service
Metro Faith Official: https://hkmu-hk.campuslabs.com/engage (NOT our work)

## Project information

**Metro FAITH** is a server-side course project that helps students discover activities, register and track their engagement across five categories. SAO staff can manage activities, student records and statistics. 

This is a student project, not an official HKMU service. The project goals and levels are separate from official award criteria.

- **Project name:** Metro Faith 88
- **Group:** 88
- **Live application:** https://comp3810sef-group88.onrender.com

| Member | Student ID | Division of work |
| --- | --- | --- |
| KWOK Yiu Po | 13487029 | Presentation, RESTful CRUD, OAuth, cloud deployment, SAO dashboard |
| LI Chak Fai | 13428853 | Part F design; data preprocessing, including web scraping and images design |
| Cai Zhiqing | 13420369 | Part A design; CSS and UI design |
| Tse Yuen Tung | 13496260 | Part I design; CSS and UI design |
| HU Tianle | 13357905 | Part T design; local deployment and testing |
| CHEN Zihan | 13484353 | Part H design; SAO dashboard and SAO Statistics |

- **Part F:** Future Skills & Intelligence
- **Part A:** Aesthetics & Spirituality
- **Part I:** Igniting & Sports
- **Part T:** Temperance & Justice
- **Part H:** Humanity & Love
- **OAuth:** Google and GitHub
- **RESTful CRUD services:** HTTP - GET, POST, PUT, DELETE


## Project files and technologies

- [`server.js`](server.js): Express configuration, authentication, student and SAO routes, and the REST API.
- [`models/`](models/): Mongoose schemas and models for users, activities and registrations (`User.js`, `Event.js` and `Registration.js`).
- [`config/categories.js`](config/categories.js): Shared activity categories used by event validation and the application.
- [`views/`](views/): EJS templates for login, registration, student pages, event management, records and statistics.
- [`public/`](public/): CSS, logos and other static assets.
- [`package.json`](package.json) and [`package-lock.json`](package-lock.json): Dependencies, Node requirement and the start script.

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

Google and GitHub OAuth are implemented.

## How to start

### Local development

**Prerequisites:** Node.js 20 or later, npm and a running MongoDB database. MongoDB Atlas may also be used.

1. Clone the repository and enter the project directory:

   ```sh
   git clone https://github.com/bobo-1024-AA/COMP3810SEF_Group88
   ```

2. **Delete the package-lock.json.** Install the dependencies and create a local configuration:

   ```sh
   npm install
   ```

3. Edit `.env`.


4. Start the application with `npm start` and open `http://localhost:3000`.

### Cloud deployment

For a Render Node web service, use `npm ci` as the build command and `npm start` as the start command. Configure the variables above in Render, set `NODE_ENV=production` for secure session cookies, and configure MongoDB Atlas access if using Atlas. A deployment requires your own accounts and must be verified in the target environment.

### Optional OAuth

### Google sign-in

Create a Google OAuth web application, configure its consent screen, and add `https://your-app.example.com/auth/google/callback` as an authorized redirect URI (replace the origin with your app URL). Set `APP_BASE_URL`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the hosting platform; do not commit real credentials. Google sign-in creates a student account for a new Google identity. Existing accounts are not automatically linked; use their original sign-in method. Email/password registrations do not verify email addresses. Google sign-in requires Google to report a verified email.

### GitHub sign-in

Create a GitHub OAuth App and set its authorization callback URL to `https://your-app.example.com/auth/github/callback` (replace the origin with your app URL). Set `APP_BASE_URL`, `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in the environment; never commit credentials. The button appears when all three are configured. GitHub sign-in creates a student account and requires a verified primary GitHub email. Existing accounts are not automatically linked; use their original sign-in method. Live sign-in requires GitHub access and valid OAuth App credentials.


## Operation guide

### Login and registration

The following accounts were supplied for the project demonstration:

| Role | Email | Password |
| --- | --- | --- |
| SAO | `hkmusao@live.hkmu.edu.hk` | `hkmusao@min` |
| Student | `student@live.hkmu.edu.hk` | `COMP3810sef` |

- Open `/login`, enter email and password, and click **Log in**.
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

### SAO web CRUD walkthrough

1. Start the server, open `/login` and sign in using an SAO account. For a local demonstration, the account is initially provisioned from `SAO_EMAIL` and `SAO_PASSWORD` when the configured email does not already exist. A student account cannot access the SAO management pages.
2. Open **SAO dashboard** and select **+ Create event**. Enter the activity details, optionally select an image and press **Save event**.
3. Use the dashboard's **Search** field to find an activity by name; **Clear** restores the full list. The student **Events** page also supports search, category and availability filters.
4. Select **Edit** beside an activity, change its details and press **Save event**. An existing image remains unless it is replaced or removed.
5. Select **Delete** beside an activity and confirm the prompt. The activity disappears from active lists while its registration history is retained. Select **Log out** in the navigation when finished.

For a command-line demonstration of the authenticated web form, log in as SAO in a second terminal while the server is running. Enter the account details when prompted; use a test account and do not commit credentials. The cookie file contains an active session, so keep it private.

```bash
read -r -p "SAO email: " sao_email
read -r -s -p "SAO password: " sao_password
printf '\n'
umask 077
curl -i -c /tmp/metrofaith-cookies.txt \
  -X POST "http://localhost:3000/login" \
  --data-urlencode "email=$sao_email" \
  --data-urlencode "password=$sao_password"
unset sao_email sao_password
```

A successful SAO login normally redirects to `/events`. After confirming that login succeeded, replace the image path below with an existing JPG, PNG or WebP file on your computer, then submit the web form:

```bash
IMAGE_PATH="/absolute/path/to/test.jpg"
curl -i -b /tmp/metrofaith-cookies.txt \
  -X POST "http://localhost:3000/admin/events" \
  -F "name=Traditional Chinese Medicine Wellness Talk: Recovery Guide for Late-Nighters" \
  -F "description=Understand the effects of staying up late from a Traditional Chinese Medicine perspective and learn basic wellness concepts" \
  -F "date=2027-06-20T06:00:00.000Z" \
  -F "location=Room H002, Ho Man Tin Plaza Learning Centre" \
  -F "category=Igniting & Sports" \
  -F "capacity=30" \
  -F "deadline=2027-06-19T06:00:00.000Z" \
  -F "hours=2" \
  -F "image=@$IMAGE_PATH"
```

On success the form redirects to `/admin`. Use the dashboard to search for, edit or delete this test activity. After completing the demonstration, end the curl session and remove the saved cookie file:

```bash
curl -b /tmp/metrofaith-cookies.txt -X POST "http://localhost:3000/logout"
rm /tmp/metrofaith-cookies.txt
```

Form routes use POST for edits and removals; the separate REST examples below demonstrate the required PUT and DELETE methods.

## RESTful CRUD Services

The assignment requires an unauthenticated API using GET, POST, PUT and DELETE. The endpoints below operate on activity documents. They are separate from the SAO web forms, which require login and use form POST requests. REST POST and PUT accept JSON; they do not accept image uploads.

| Operation | HTTP method | URI | Successful response `-i` |
| --- | --- | --- | --- |
| Create | POST | `/api/events` | `201 Created` and activity JSON |
| Read all | GET | `/api/events` | `200 OK` and an array of active activities |
| Read one | GET | `/api/events/:id` | `200 OK` and activity JSON |
| Search | GET | `/api/events?search=...` | `200 OK` and matching active activities |
| Update | PUT | `/api/events/:id` | `200 OK` and updated activity JSON |
| Delete | DELETE | `/api/events/:id` | `204 No Content` |

When localhost and the deployed website share a MongoDB database, changes made locally also affect the website. 

Both **POST** and **PUT** require the full editable activity: `name`, `description`, `date`, `location`, `category`, `capacity`, `deadline` and `hours`.
- Use an exact category name from the progress section, a positive integer capacity, and at least 0.1 hours.
- The deadline must not be later than the activity date.
- PUT is a full update of these fields, not a partial update.
- Dates below are in UTC; `06:00Z` is 14:00 in Hong Kong.

### REST API demonstration

In terminal 1, start the application as described in **How to start**:

```bash
cd COMP3810SEF_Group88
npm start
```

In terminal 2, run the following commands in order. The activity is disposable test data; the final command removes it. The **JSON** API does not add an image.

**1. Create — HTTP POST `/api/events`**

```bash
curl -X POST "http://localhost:3000/api/events" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Traditional Chinese Medicine Wellness Talk: Recovery Guide for Late-Nighters",
    "description": "Understand the effects of staying up late from a Traditional Chinese Medicine perspective and learn basic wellness concepts",
    "date": "2027-06-20T06:00:00.000Z",
    "location": "Room H002, Ho Man Tin Plaza Learning Centre",
    "category": "Igniting & Sports",
    "capacity": 30,
    "deadline": "2027-06-19T06:00:00.000Z",
    "hours": 2
  }'
```

Copy the returned `_id` into the variable below.
```bash
EVENT_ID="paste-the-returned-id-here"
```
- Do not include spaces inside the quotes.

**2. Read all — HTTP GET `/api/events`**

```bash
curl -X GET "http://localhost:3000/api/events"
```

**3. Read one — HTTP GET `/api/events/:id`**

```bash
curl -X GET "http://localhost:3000/api/events/$EVENT_ID"
```

A valid ID for an unavailable or removed activity returns `404`; a malformed ID returns `400`.

**4. Search — HTTP GET `/api/events?search=...`**

```bash
curl -G "http://localhost:3000/api/events" \
  --data-urlencode "search=Traditional Chinese Medicine Wellness Talk"
```

The `search` parameter matches activity names; `category` can also filter by an exact category. An unrecognized category is ignored. Check `_id` when multiple activities have the same name.

**5. Update — HTTP PUT `/api/events/:id`**

Change the category from `Igniting & Sports` to `Future Skills & Intelligence` while supplying all editable fields:

```bash
curl -X PUT "http://localhost:3000/api/events/$EVENT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Traditional Chinese Medicine Wellness Talk: Recovery Guide for Late-Nighters",
    "description": "Understand the effects of staying up late from a Traditional Chinese Medicine perspective and learn basic wellness concepts",
    "date": "2027-06-20T06:00:00.000Z",
    "location": "Room H002, Ho Man Tin Plaza Learning Centre",
    "category": "Future Skills & Intelligence",
    "capacity": 30,
    "deadline": "2027-06-19T06:00:00.000Z",
    "hours": 2
  }'
```

The response contains the updated activity. Invalid fields or a capacity below occupied registrations return `400`; a valid but unavailable ID returns `404`.

**6. Read again — HTTP GET `/api/events/:id`**

```bash
curl -X GET "http://localhost:3000/api/events/$EVENT_ID"
```

Confirm that `category` is `Future Skills & Intelligence`.

**7. Delete — HTTP DELETE `/api/events/:id`**

```bash
curl -X DELETE "http://localhost:3000/api/events/$EVENT_ID"
```

A successful delete returns `204 No Content`, so `curl` prints no response body. A later GET for this ID returns `404`. 

## For debugging
Add `-i` to a curl command to display the HTTP status and headers.
