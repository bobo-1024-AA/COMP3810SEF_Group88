// === Configuration and dependencies ===
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const app = express();
// === Shared activity categories and database models ===
const categories = require('./config/categories');
const User = require('./models/User');
const Event = require('./models/Event');
const Registration = require('./models/Registration');
// === Express, sessions, and request context ===
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
const uri = process.env.MONGODB_URI;
if (!uri || !process.env.SESSION_SECRET) {
  console.error('MONGODB_URI and SESSION_SECRET are required');
  process.exit(1);
}
app.set('trust proxy', 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: uri }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 86400000,
    },
  }),
);
const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.APP_BASE_URL,
);
const githubEnabled = Boolean(
  process.env.GITHUB_CLIENT_ID &&
  process.env.GITHUB_CLIENT_SECRET &&
  process.env.APP_BASE_URL,
);
// Load the signed-in user and common template data for each request.
app.use(async (req, res, next) => {
  try {
    res.locals.user = req.session.userId
      ? await User.findById(req.session.userId).lean()
      : null;
    res.locals.categories = categories;
    res.locals.googleEnabled = googleEnabled;
    res.locals.githubEnabled = githubEnabled;
    res.locals.error = null;
    next();
  } catch (e) {
    next(e);
  }
});
// Require a signed-in user for protected routes.
const auth = (req, res, next) =>
  res.locals.user ? next() : res.redirect('/login');
// Accept activity images in memory before validating their file signatures.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('image');
// Validate uploaded image size and detect the supported image type.
function eventUpload(req, res, next) {
  upload(req, res, (err) => {
    if (err) return res.status(400).send('Image must be no larger than 2 MB.');
    if (req.file) {
      const b = req.file.buffer;
      const jpeg =
        b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
      const png =
        b.length > 8 &&
        b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
      const webp =
        b.length > 12 &&
        b.toString('ascii', 0, 4) === 'RIFF' &&
        b.toString('ascii', 8, 12) === 'WEBP';
      if (!jpeg && !png && !webp)
        return res.status(400).send('Please upload a JPG, PNG or WebP image.');
      req.imageType = jpeg ? 'image/jpeg' : png ? 'image/png' : 'image/webp';
    }
    next();
  });
}
// Restrict administrative routes to SAO users.
const sao = (req, res, next) =>
  res.locals.user?.role === 'sao'
    ? next()
    : res.status(403).send('SAO access required');
// Forward rejected route promises to Express error handling.
const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
// Render a page inside the shared layout.
const page = (res, view, data = {}) => res.render('layout', { view, ...data });
// === Authentication and account routes ===
// Redirect users to the appropriate landing page. (GET /)
app.get('/', (req, res) => {
  if (!res.locals.user) return res.redirect('/login');
  if (res.locals.user.role !== 'student') return res.redirect('/events');
  page(res, 'home');
});
// Remove a trailing slash from the configured OAuth callback base URL.
function baseUrl() {
  return process.env.APP_BASE_URL.replace(/\/$/, '');
}
// Start a fresh session after authentication and redirect by role.
function loginUser(req, res, next, user) {
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.userId = user.id;
    req.session.save((saveErr) => {
      if (saveErr) return next(saveErr);
      res.redirect(user.role === 'student' ? '/' : '/events');
    });
  });
}
// Show the sign-in page. (GET /login)
app.get('/login', (req, res) => page(res, 'login'));
// Authenticate an email and password. (POST /login)
app.post(
  '/login',
  asyncRoute(async (req, res, next) => {
    const u = await User.findOne({
      email: String(req.body.email || '')
        .toLowerCase()
        .trim(),
    });
    if (
      !u ||
      !u.password ||
      !(await bcrypt.compare(req.body.password || '', u.password))
    ) {
      res.locals.error = 'Incorrect email or password.';
      return res.status(400).render('layout', { view: 'login' });
    }
    loginUser(req, res, next, u);
  }),
);
// Show the student account registration form. (GET /register)
app.get('/register', (req, res) => page(res, 'register'));
// Validate and create a student account. (POST /register)
app.post(
  '/register',
  asyncRoute(async (req, res) => {
    const { name, email, password } = req.body;
    if (
      !name?.trim() ||
      !/^\S+@\S+\.\S+$/.test(email || '') ||
      !password ||
      password.length < 8
    ) {
      res.locals.error =
        'Enter a name, valid email and password of at least 8 characters.';
      return res.status(400).render('layout', { view: 'register' });
    }
    try {
      await User.create({
        name: name.trim(),
        email,
        password: await bcrypt.hash(password, 12),
      });
      res.redirect('/login');
    } catch (e) {
      if (e.code === 11000) {
        res.locals.error = 'This email is already registered.';
        return res.status(400).render('layout', { view: 'register' });
      }
      throw e;
    }
  }),
);
// Start GitHub OAuth with state and PKCE. (GET /auth/github)
app.get('/auth/github', (req, res, next) => {
  if (!githubEnabled)
    return res.status(503).send('GitHub sign-in is not configured.');
  const state = crypto.randomBytes(32).toString('hex');
  const verifier = crypto.randomBytes(32).toString('base64url');
  req.session.githubState = state;
  req.session.githubVerifier = verifier;
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: baseUrl() + '/auth/github/callback',
    scope: 'read:user user:email',
    state,
    code_challenge: crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url'),
    code_challenge_method: 'S256',
  });
  // Persist the state and PKCE verifier before leaving for GitHub.
  req.session.save((err) => {
    if (err) return next(err);
    res.redirect('https://github.com/login/oauth/authorize?' + params);
  });
});
// Display GitHub sign-in errors on the login page so the user can retry.
function githubSignInError(res, message, status = 400) {
  res.locals.error = message;
  return res.status(status).render('layout', { view: 'login' });
}
// Verify the GitHub OAuth response and sign in the user. (GET /auth/github/callback)
app.get(
  '/auth/github/callback',
  asyncRoute(async (req, res, next) => {
    const state = req.session.githubState,
      verifier = req.session.githubVerifier;
    delete req.session.githubState;
    delete req.session.githubVerifier;
    if (
      !githubEnabled ||
      !state ||
      !verifier ||
      typeof req.query.state !== 'string' ||
      req.query.state !== state
    )
      return githubSignInError(
        res,
        'GitHub sign-in could not be verified. Start again from this login page, using the same website address and allowing cookies.',
      );
    if (req.query.error || typeof req.query.code !== 'string' || !req.query.code)
      return githubSignInError(
        res,
        'GitHub sign-in was cancelled or no authorization code was returned. Please try again.',
      );
    let tokenRes;
    try {
      tokenRes = await fetch(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code: req.query.code,
            redirect_uri: baseUrl() + '/auth/github/callback',
            code_verifier: verifier,
          }),
          signal: AbortSignal.timeout(10000),
        },
      );
    } catch (err) {
      return githubSignInError(
        res,
        'Could not contact GitHub. Please try again.',
        502,
      );
    }
    if (!tokenRes.ok)
      return githubSignInError(res, 'GitHub sign-in failed. Please try again.');
    const tokens = await tokenRes.json();
    if (typeof tokens.access_token !== 'string' || !tokens.access_token)
      return githubSignInError(res, 'GitHub sign-in failed. Please try again.');
    const headers = {
      Authorization: 'Bearer ' + tokens.access_token,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Metro-FAITH',
    };
    let profileRes, emailsRes;
    try {
      [profileRes, emailsRes] = await Promise.all([
        fetch('https://api.github.com/user', {
          headers,
          signal: AbortSignal.timeout(10000),
        }),
        fetch('https://api.github.com/user/emails', {
          headers,
          signal: AbortSignal.timeout(10000),
        }),
      ]);
    } catch (err) {
      return githubSignInError(
        res,
        'Could not contact GitHub. Please try again.',
        502,
      );
    }
    if (!profileRes.ok || !emailsRes.ok)
      return githubSignInError(res, 'GitHub sign-in failed. Please try again.');
    const profile = await profileRes.json(),
      emails = await emailsRes.json();
    const primary =
      Array.isArray(emails) &&
      emails.find(
        (e) =>
          e.primary === true &&
          e.verified === true &&
          typeof e.email === 'string',
      );
    if (
      !Number.isSafeInteger(profile.id) ||
      profile.id <= 0 ||
      !primary ||
      !/^\S+@\S+\.\S+$/.test(primary.email.trim())
    )
      return githubSignInError(
        res,
        'GitHub must provide a verified primary email.',
      );
    const githubId = String(profile.id),
      email = primary.email.toLowerCase().trim();
    let user = await User.findOne({ githubId });
    if (!user) {
      if (await User.findOne({ email }))
        return githubSignInError(
          res,
          'An account with this email already exists. Please use its original login method.',
        );
      try {
        user = await User.create({
          name:
            typeof profile.name === 'string' && profile.name.trim()
              ? profile.name.trim()
              : profile.login || email,
          email,
          githubId,
          role: 'student',
        });
      } catch (e) {
        if (e.code === 11000)
          return githubSignInError(
            res,
            'This account already exists. Please use its original login method.',
          );
        throw e;
      }
    }
    loginUser(req, res, next, user);
  }),
);
// Start Google OAuth with state and PKCE. (GET /auth/google)
app.get('/auth/google', (req, res) => {
  if (!googleEnabled)
    return res.status(503).send('Google sign-in is not configured.');
  const state = crypto.randomBytes(32).toString('hex');
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  req.session.googleState = state;
  req.session.googleVerifier = verifier;
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: baseUrl() + '/auth/google/callback',
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + params);
});
// Verify the Google OAuth response and sign in the user. (GET /auth/google/callback)
app.get(
  '/auth/google/callback',
  asyncRoute(async (req, res, next) => {
    const state = req.session.googleState,
      verifier = req.session.googleVerifier;
    delete req.session.googleState;
    delete req.session.googleVerifier;
    if (
      !googleEnabled ||
      !state ||
      !verifier ||
      typeof req.query.state !== 'string' ||
      req.query.state !== state ||
      typeof req.query.code !== 'string'
    )
      return res
        .status(400)
        .send('Google sign-in could not be verified. Please try again.');
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: req.query.code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: baseUrl() + '/auth/google/callback',
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!tokenRes.ok)
      return res.status(400).send('Google sign-in failed. Please try again.');
    const tokens = await tokenRes.json();
    if (typeof tokens.access_token !== 'string')
      return res.status(400).send('Google sign-in failed.');
    const profileRes = await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        headers: { Authorization: 'Bearer ' + tokens.access_token },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!profileRes.ok) return res.status(400).send('Google sign-in failed.');
    const profile = await profileRes.json();
    if (
      typeof profile.sub !== 'string' ||
      !profile.sub ||
      typeof profile.email !== 'string' ||
      profile.email_verified !== true
    )
      return res
        .status(400)
        .send('Google must provide a verified email address.');
    let user = await User.findOne({ googleId: profile.sub });
    if (!user) {
      const email = profile.email.toLowerCase().trim();
      if (await User.findOne({ email }))
        return res
          .status(400)
          .send(
            'An account with this email already exists. Please use its original login method.',
          );
      try {
        user = await User.create({
          name:
            typeof profile.name === 'string' && profile.name.trim()
              ? profile.name
              : email,
          email,
          googleId: profile.sub,
          role: 'student',
        });
      } catch (e) {
        if (e.code === 11000)
          return res
            .status(400)
            .send(
              'This email is already registered. Use the original login method.',
            );
        throw e;
      }
    }
    loginUser(req, res, next, user);
  }),
);
// Show the sign-out confirmation. (GET /logout)
app.get('/logout', (req, res) =>
  res.locals.user ? page(res, 'logout') : res.redirect('/login'),
);
// Destroy the session and clear its cookie. (POST /logout)
app.post('/logout', (req, res, next) =>
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid', { path: '/' });
    res.redirect('/login');
  }),
);
// === Activity browsing and student registrations ===
// Serve a stored activity image to authenticated users. (GET /events/:id/image)
app.get(
  '/events/:id/image',
  auth,
  asyncRoute(async (req, res) => {
    const event = await Event.findOne({
      _id: req.params.id,
      removed: false,
      hasImage: true,
    })
      .select('+image.data')
      .lean();
    if (!event?.image?.data) return res.sendStatus(404);
    res
      .type(event.image.contentType)
      .set('Cache-Control', 'private, no-cache')
      .send(event.image.data.buffer || event.image.data);
  }),
);
// List and filter activities with the user’s registrations. (GET /events)
app.get(
  '/events',
  auth,
  asyncRoute(async (req, res) => {
    let q = { removed: false };
    const availability = ['open', 'closed', 'all'].includes(
      req.query.availability,
    )
      ? req.query.availability
      : 'open';
    const now = new Date();
    if (availability === 'open') {
      q.deadline = { $gt: now };
      q.date = { $gt: now };
    } else if (availability === 'closed') {
      q.$or = [{ deadline: { $lte: now } }, { date: { $lte: now } }];
    }
    if (categories.includes(req.query.category))
      q.category = req.query.category;
    if (req.query.search)
      q.name = {
        $regex: req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i',
      };
    const events = await Event.find(q).sort({ date: 1 }).lean();
    const regs = await Registration.find({
      student: res.locals.user._id,
    }).lean();
    page(res, 'events', { events, regs, query: req.query, availability });
  }),
);
// Register a student or add them to the waiting list. (POST /events/:id/register)
app.post(
  '/events/:id/register',
  auth,
  asyncRoute(async (req, res) => {
    if (res.locals.user.role !== 'student')
      return res.status(403).send('Students only');
    const event = await Event.findOne({ _id: req.params.id, removed: false });
    if (!event || event.deadline <= new Date() || event.date <= new Date())
      return res.status(400).send('Registration is closed.');
    const existing = await Registration.findOne({
      event: event.id,
      student: res.locals.user._id,
    });
    if (existing && existing.status !== 'cancelled')
      return res.status(400).send('Already registered.');
    const count = await Registration.countDocuments({
      event: event.id,
      status: { $in: ['pending', 'confirmed', 'completed'] },
    });
    const status = count >= event.capacity ? 'waitlisted' : 'pending';
    if (existing) {
      existing.status = status;
      existing.createdAt = new Date();
      await existing.save();
    } else
      await Registration.create({
        event: event.id,
        student: res.locals.user._id,
        status,
      });
    res.redirect('/my-activity');
  }),
);
// Fill available places from the oldest waitlisted registrations.
async function promote(eventId, excludeId) {
  const event = await Event.findById(eventId);
  if (!event || event.removed || event.date <= new Date()) return;
  const count = await Registration.countDocuments({
    event: eventId,
    status: { $in: ['pending', 'confirmed', 'completed'] },
  });
  for (let slots = event.capacity - count; slots > 0; slots--) {
    const next = await Registration.findOne({
      event: eventId,
      status: 'waitlisted',
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).sort({ createdAt: 1 });
    if (!next) break;
    next.status = 'pending';
    await next.save();
  }
}
// Cancel a student registration and fill the released place. (POST /registrations/:id/cancel)
app.post(
  '/registrations/:id/cancel',
  auth,
  asyncRoute(async (req, res) => {
    const r = await Registration.findOne({
      _id: req.params.id,
      student: res.locals.user._id,
    }).populate('event');
    if (
      !r ||
      !r.event ||
      !['pending', 'confirmed', 'waitlisted'].includes(r.status) ||
      r.event.date <= new Date()
    )
      return res.status(400).send('Cannot cancel this registration.');
    const occupied = r.status !== 'waitlisted';
    r.status = 'cancelled';
    await r.save();
    if (occupied) await promote(r.event._id);
    res.redirect('/my-activity');
  }),
);
// Show the student’s registrations and completed hours. (GET /my-activity)
app.get(
  '/my-activity',
  auth,
  asyncRoute(async (req, res) => {
    const regs = await Registration.find({ student: res.locals.user._id })
      .populate('event')
      .sort({ createdAt: -1 })
      .lean();
    const progress = categories.map((category) => {
      const completed = regs.filter(
        (r) => r.status === 'completed' && r.event?.category === category,
      );
      return {
        category,
        count: completed.length,
        hours: completed.reduce((sum, r) => sum + r.event.hours, 0),
      };
    });
    page(res, 'activity', { regs, progress });
  }),
);
// === SAO reporting and record management ===
// Calculate student achievement levels and category rankings. (GET /admin/statistics)
app.get(
  '/admin/statistics',
  auth,
  sao,
  asyncRoute(async (req, res) => {
    const [students, registrations] = await Promise.all([
      User.find({ role: 'student' }).select('name email').lean(),
      Registration.find({ status: 'completed' })
        .populate('event', 'category hours')
        .lean(),
    ]);
    const stats = students.map((student) => ({
      student,
      hours: Object.fromEntries(categories.map((category) => [category, 0])),
    }));
    const byId = new Map(stats.map((item) => [String(item.student._id), item]));
    for (const registration of registrations) {
      const item = byId.get(String(registration.student)),
        event = registration.event;
      if (item && event && categories.includes(event.category))
        item.hours[event.category] += event.hours;
    }
    const levels = {
      'Beginning Level': 0,
      'Accomplishing Level': 0,
      'Mastering Level': 0,
    };
    for (const item of stats) {
      const values = categories.map((category) => item.hours[category]);
      item.total = values.reduce((a, b) => a + b, 0);
      item.level = values.every((hours) => hours >= 5)
        ? 'Mastering Level'
        : values.every((hours) => hours >= 3)
          ? 'Accomplishing Level'
          : 'Beginning Level';
      levels[item.level]++;
    }
    const compare = (a, b) =>
      a.student.name.localeCompare(b.student.name) ||
      a.student.email.localeCompare(b.student.email) ||
      String(a.student._id).localeCompare(String(b.student._id));
    const categoryRankings = categories.map((category) => ({
      category,
      students: stats
        .filter((item) => item.hours[category] > 0)
        .sort((a, b) => b.hours[category] - a.hours[category] || compare(a, b))
        .slice(0, 5),
    }));
    const mastering = stats
      .filter((item) => item.level === 'Mastering Level')
      .sort((a, b) => b.total - a.total || compare(a, b))
      .slice(0, 20);
    page(res, 'statistics', { categoryRankings, mastering, levels });
  }),
);
// Show the SAO activity dashboard. (GET /admin)
app.get(
  '/admin',
  auth,
  sao,
  asyncRoute(async (req, res) => {
    const search =
      typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const allEvents = await Event.find({ removed: false })
      .sort({ date: 1 })
      .lean();
    const events = search
      ? allEvents.filter((event) =>
          event.name.toLowerCase().includes(search.toLowerCase()),
        )
      : allEvents;
    page(res, 'admin', { events, search });
  }),
);
// Search and filter registration records. (GET /admin/records)
app.get(
  '/admin/records',
  auth,
  sao,
  asyncRoute(async (req, res) => {
    const regs = await Registration.find()
      .populate('event')
      .populate('student', 'name email role')
      .sort({ createdAt: -1 })
      .lean();
    const search = String(req.query.search || '')
      .trim()
      .toLowerCase();
    const status = String(req.query.status || '');
    const records = regs.filter(
      (r) =>
        r.student &&
        (!status || r.status === status) &&
        (!search ||
          [r.student.name, r.student.email, r.event?.name].some((value) =>
            value?.toLowerCase().includes(search),
          )),
    );
    page(res, 'records', {
      records,
      search,
      status,
      updated: req.query.updated === '1',
    });
  }),
);
// Update a registration and handle capacity changes. (POST /admin/records/:id)
app.post(
  '/admin/records/:id',
  auth,
  sao,
  asyncRoute(async (req, res) => {
    const statuses = [
      'pending',
      'confirmed',
      'waitlisted',
      'completed',
      'cancelled',
    ];
    const target = req.body.status;
    if (!statuses.includes(target))
      return res.status(400).send('Invalid status.');
    const r = await Registration.findById(req.params.id).populate('event');
    if (!r || !r.event) return res.sendStatus(404);
    if (target === 'completed' && r.event.date > new Date())
      return res
        .status(400)
        .send('An activity cannot be marked completed before it starts.');
    const occupies = (status) =>
      ['pending', 'confirmed', 'completed'].includes(status);
    if (['pending', 'confirmed'].includes(target) && !occupies(r.status)) {
      const count = await Registration.countDocuments({
        event: r.event._id,
        status: { $in: ['pending', 'confirmed', 'completed'] },
      });
      if (count >= r.event.capacity)
        return res
          .status(400)
          .send(
            'This event is full. Increase its capacity before changing this record to that status.',
          );
    }
    const released = occupies(r.status) && !occupies(target);
    r.status = target;
    await r.save();
    if (released)
      await promote(r.event._id, target === 'waitlisted' ? r._id : null);
    res.redirect(
      req.body.returnToEvent === '1'
        ? '/admin/events/' + r.event._id + '/records?updated=1'
        : '/admin/records?updated=1',
    );
  }),
);
// Show an activity’s records and available students. (GET /admin/events/:id/records)
app.get(
  '/admin/events/:id/records',
  auth,
  sao,
  asyncRoute(async (req, res) => {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.sendStatus(404);
    const records = await Registration.find({ event: event._id })
      .populate('student', 'name email role')
      .sort({ createdAt: 1 })
      .lean();
    const students = await User.find({ role: 'student' })
      .select('name email')
      .sort({ name: 1, email: 1 })
      .lean();
    page(res, 'event-records', {
      event,
      records,
      students,
      updated: req.query.updated === '1',
      added: Number(req.query.added) || 0,
      skipped: Number(req.query.skipped) || 0,
    });
  }),
);
// Add or restore selected student registrations. (POST /admin/events/:id/records)
app.post(
  '/admin/events/:id/records',
  auth,
  sao,
  asyncRoute(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.sendStatus(404);
    const status = req.body.status,
      statuses = [
        'pending',
        'confirmed',
        'waitlisted',
        'completed',
        'cancelled',
      ];
    if (!statuses.includes(status))
      return res.status(400).send('Invalid status.');
    if (status === 'completed' && event.date > new Date())
      return res
        .status(400)
        .send('An activity cannot be marked completed before it starts.');
    const supplied = Array.isArray(req.body.students)
      ? req.body.students
      : typeof req.body.students === 'string'
        ? [req.body.students]
        : [];
    const ids = [...new Set(supplied)];
    if (
      !ids.length ||
      ids.some((id) => typeof id !== 'string' || !mongoose.isValidObjectId(id))
    )
      return res.status(400).send('Please select valid students.');
    const students = await User.find({ _id: { $in: ids }, role: 'student' })
      .select('_id')
      .lean();
    if (students.length !== ids.length)
      return res.status(400).send('One or more selected students are invalid.');
    const existing = await Registration.find({
      event: event._id,
      student: { $in: ids },
    });
    const byStudent = new Map(existing.map((r) => [String(r.student), r]));
    const eligible = ids.filter((id) => {
      const r = byStudent.get(id);
      return !r || (r.status === 'cancelled' && status !== 'cancelled');
    });
    let skipped = ids.length - eligible.length;
    if (['pending', 'confirmed'].includes(status) && eligible.length) {
      const count = await Registration.countDocuments({
        event: event._id,
        status: { $in: ['pending', 'confirmed', 'completed'] },
      });
      if (count + eligible.length > event.capacity)
        return res
          .status(400)
          .send(
            'Not enough places for all selected students. Increase capacity or select fewer students. No records were changed.',
          );
    }
    let added = 0;
    for (const id of eligible) {
      try {
        const r = byStudent.get(id);
        if (r) {
          r.status = status;
          await r.save();
        } else
          await Registration.create({ event: event._id, student: id, status });
        added++;
      } catch (e) {
        if (e.code === 11000) {
          skipped++;
          continue;
        }
        console.error('Bulk record update failed:', e.message);
        return res
          .status(500)
          .send(
            'Only ' +
              added +
              ' record(s) were saved before an error occurred. Please review the activity records before retrying.',
          );
      }
    }
    res.redirect(
      '/admin/events/' +
        event._id +
        '/records?added=' +
        added +
        '&skipped=' +
        skipped,
    );
  }),
);
// Delete a registration and fill any released place. (POST /admin/events/:id/records/:recordId/delete)
app.post(
  '/admin/events/:id/records/:recordId/delete',
  auth,
  sao,
  asyncRoute(async (req, res) => {
    const record = await Registration.findOneAndDelete({
      _id: req.params.recordId,
      event: req.params.id,
    });
    if (!record) return res.sendStatus(404);
    if (['pending', 'confirmed', 'completed'].includes(record.status))
      await promote(record.event);
    res.redirect('/admin/events/' + req.params.id + '/records?updated=1');
  }),
);
// Show the activity creation form. (GET /admin/events/new)
app.get('/admin/events/new', auth, sao, (req, res) =>
  page(res, 'form', { event: null }),
);
// Show the activity editing form. (GET /admin/events/:id/edit)
app.get(
  '/admin/events/:id/edit',
  auth,
  sao,
  asyncRoute(async (req, res) => {
    const event = await Event.findById(req.params.id).lean();
    if (!event || event.removed) return res.sendStatus(404);
    page(res, 'form', { event });
  }),
);
// Select the submitted fields accepted for an activity.
function eventData(b) {
  return {
    name: b.name,
    description: b.description,
    date: b.date,
    location: b.location,
    category: b.category,
    capacity: b.capacity,
    deadline: b.deadline,
    hours: b.hours,
  };
}
// Check required activity fields, capacity, hours, and dates.
function validateEvent(b) {
  const date = new Date(b.date),
    deadline = new Date(b.deadline);
  return (
    b.name?.trim() &&
    b.description?.trim() &&
    b.location?.trim() &&
    categories.includes(b.category) &&
    Number.isInteger(Number(b.capacity)) &&
    Number(b.capacity) > 0 &&
    Number(b.hours) > 0 &&
    !isNaN(date) &&
    !isNaN(deadline) &&
    deadline <= date
  );
}
// Validate and create an activity. (POST /admin/events)
app.post(
  '/admin/events',
  auth,
  sao,
  eventUpload,
  asyncRoute(async (req, res) => {
    if (!validateEvent(req.body))
      return res
        .status(400)
        .send(
          'Please enter valid event details. The deadline must be before the event.',
        );
    const data = eventData(req.body);
    if (req.file) {
      data.image = { data: req.file.buffer, contentType: req.imageType };
      data.hasImage = true;
    }
    await Event.create(data);
    res.redirect('/admin');
  }),
);
// Update an activity while preserving capacity constraints. (POST /admin/events/:id)
app.post(
  '/admin/events/:id',
  auth,
  sao,
  eventUpload,
  asyncRoute(async (req, res) => {
    if (!validateEvent(req.body))
      return res.status(400).send('Invalid event details.');
    const occupied = await Registration.countDocuments({
      event: req.params.id,
      status: { $in: ['pending', 'confirmed', 'completed'] },
    });
    if (Number(req.body.capacity) < occupied)
      return res
        .status(400)
        .send('Capacity cannot be lower than current registrations.');
    const data = eventData(req.body);
    if (req.file) {
      data.image = { data: req.file.buffer, contentType: req.imageType };
      data.hasImage = true;
    } else if (req.body.removeImage) {
      data.image = null;
      data.hasImage = false;
    }
    await Event.findOneAndUpdate({ _id: req.params.id, removed: false }, data, {
      runValidators: true,
    });
    await promote(req.params.id);
    res.redirect('/admin');
  }),
);
// Mark an activity as removed. (POST /admin/events/:id/delete)
app.post(
  '/admin/events/:id/delete',
  auth,
  sao,
  asyncRoute(async (req, res) => {
    await Event.findByIdAndUpdate(req.params.id, { removed: true });
    res.redirect('/admin');
  }),
);
// Advance a registration through permitted status changes. (POST /admin/registrations/:id)
app.post(
  '/admin/registrations/:id',
  auth,
  sao,
  asyncRoute(async (req, res) => {
    const r = await Registration.findById(req.params.id).populate('event');
    if (!r || !r.event || r.event.removed) return res.sendStatus(404);
    const target = req.body.status;
    if (!(
      (r.status === 'pending' && target === 'confirmed') ||
      (r.status === 'confirmed' &&
        target === 'completed' &&
        r.event.date <= new Date())
    ))
      return res.status(400).send('Invalid status change.');
    r.status = target;
    await r.save();
    res.redirect('/admin');
  }),
);
// === Event REST API ===
// Assignment requires unauthenticated REST CRUD for event documents.
// Return activity documents with optional filters. (GET /api/events)
app.get(
  '/api/events',
  asyncRoute(async (req, res) => {
    const q = { removed: false };
    if (categories.includes(req.query.category))
      q.category = req.query.category;
    if (req.query.search)
      q.name = {
        $regex: req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i',
      };
    res.json(await Event.find(q));
  }),
);
// Return one active activity by its ID. (GET /api/events/:id)
app.get(
  '/api/events/:id',
  asyncRoute(async (req, res) => {
    const event = await Event.findOne({ _id: req.params.id, removed: false });
    if (!event) return res.sendStatus(404);
    res.json(event);
  }),
);
// Create an activity through the REST API. (POST /api/events)
app.post(
  '/api/events',
  asyncRoute(async (req, res) => {
    if (!validateEvent(req.body))
      return res.status(400).json({ error: 'Invalid event' });
    res.status(201).json(await Event.create(eventData(req.body)));
  }),
);
// Update an activity through the REST API. (PUT /api/events/:id)
app.put(
  '/api/events/:id',
  asyncRoute(async (req, res) => {
    if (!validateEvent(req.body))
      return res.status(400).json({ error: 'Invalid event' });
    const occupied = await Registration.countDocuments({
      event: req.params.id,
      status: { $in: ['pending', 'confirmed', 'completed'] },
    });
    if (Number(req.body.capacity) < occupied)
      return res.status(400).json({ error: 'Capacity is below registrations' });
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, removed: false },
      eventData(req.body),
      { new: true, runValidators: true },
    );
    if (!event) return res.sendStatus(404);
    await promote(event.id);
    res.json(event);
  }),
);
// Mark an activity as removed through the REST API. (DELETE /api/events/:id)
app.delete(
  '/api/events/:id',
  asyncRoute(async (req, res) => {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, removed: false },
      { removed: true },
      { new: true },
    );
    if (!event) return res.sendStatus(404);
    res.sendStatus(204);
  }),
);
// === Error handling and startup ===

// Return validation errors without exposing server details.
app.use((err, req, res, next) => {
  console.error(err.message);
  res
    .status(
      err.name === 'CastError' || err.name === 'ValidationError' ? 400 : 500,
    )
    .send('An error occurred. Please check your input and try again.');
});
// Connect to MongoDB, provision the configured SAO account, and listen.
async function start() {
  await mongoose.connect(uri);
  if (process.env.SAO_EMAIL && process.env.SAO_PASSWORD) {
    const email = process.env.SAO_EMAIL.toLowerCase().trim();
    const existing = await User.findOne({ email });
    if (!existing)
      await User.create({
        name: 'SAO Administrator',
        email,
        password: await bcrypt.hash(process.env.SAO_PASSWORD, 12),
        role: 'sao',
      });
    else if (existing.role !== 'sao')
      throw new Error('SAO_EMAIL belongs to an existing student account');
  }
  app.listen(process.env.PORT || 3000, () =>
    console.log('Metro FAITH server started'),
  );
}
start().catch((err) => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
