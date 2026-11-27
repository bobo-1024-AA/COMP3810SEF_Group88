const mongoose = require('mongoose');

// Store account details and sign-in provider identifiers.
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: { type: String },
  googleId: { type: String, unique: true, sparse: true },
  githubId: { type: String, unique: true, sparse: true },
  role: { type: String, enum: ['student', 'sao'], default: 'student' },
});

module.exports = mongoose.model('User', userSchema);
