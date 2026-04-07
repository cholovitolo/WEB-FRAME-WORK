// models/Event.js
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  placeId:     { type: String, required: true },
  name:        { type: String, required: true },
  address:     { type: String, required: true },
  lat:         { type: Number, required: true },
  lng:         { type: Number, required: true },
  photoRef:    { type: String, default: '' },
  types:       [String],
});

const eventSchema = new mongoose.Schema(
  {
    title: {
      type:      String,
      required:  [true, 'Event title is required'],
      trim:      true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type:      String,
      required:  [true, 'Description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type:    String,
      enum:    ['Technology', 'Arts', 'Sports', 'Food', 'Music', 'Business', 'Education', 'Social', 'Other'],
      default: 'Social',
    },
    coverImage: {
      type:    String,
      default: '',
    },
    location: {
      type:     locationSchema,
      required: [true, 'Event location is required'],
    },
    date: {
      type:     Date,
      required: [true, 'Event date is required'],
    },
    endDate: {
      type: Date,
    },
    maxAttendees: {
      type:    Number,
      default: 0, // 0 = unlimited
    },
    attendees: [
      {
        user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    organizer: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    isPublic: {
      type:    Boolean,
      default: true,
    },
    tags: [String],
    status: {
      type:    String,
      enum:    ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// ─── Virtual: attendee count ─────────────────────────────────────────────────
eventSchema.virtual('attendeeCount').get(function () {
  return this.attendees.length;
});

// ─── Virtual: spots remaining ─────────────────────────────────────────────────
eventSchema.virtual('spotsRemaining').get(function () {
  if (this.maxAttendees === 0) return null; // unlimited
  return Math.max(0, this.maxAttendees - this.attendees.length);
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
eventSchema.index({ date: 1 });
eventSchema.index({ 'location.placeId': 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ status: 1 });

module.exports = mongoose.model('Event', eventSchema);