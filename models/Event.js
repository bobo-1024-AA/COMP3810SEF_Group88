const mongoose = require('mongoose');
const categories = require('../config/categories');

// Store activity details, capacity, and optional image data.
const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  location: { type: String, required: true },
  category: { type: String, enum: categories, required: true },
  capacity: { type: Number, min: 1, required: true },
  deadline: { type: Date, required: true },
  hours: { type: Number, min: 0.1, required: true },
  image: { data: { type: Buffer, select: false }, contentType: String },
  hasImage: { type: Boolean, default: false },
  removed: { type: Boolean, default: false },
});

module.exports = mongoose.model('Event', eventSchema);
