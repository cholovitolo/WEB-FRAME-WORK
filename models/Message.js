// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    event: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Event',
      required: true,
    },
    sender: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    content: {
      type:      String,
      required:  [true, 'Message content is required'],
      trim:      true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    isDeleted: {
      type:    Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

messageSchema.index({ event: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);