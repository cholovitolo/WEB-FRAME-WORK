// models/User.js
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, 'Name is required'],
      trim:     true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type:     String,
      required: [true, 'Email is required'],
      unique:   true,
      lowercase: true,
      trim:     true,
      match:    [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type:     String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select:   false,
    },
    avatar: {
      type:    String,
      default: '',
    },
    bio: {
      type:      String,
      maxlength: [300, 'Bio cannot exceed 300 characters'],
      default:   '',
    },
    location: {
      type:    String,
      default: '',
    },
    eventsCreated: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    eventsJoined:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    role: {
      type:    String,
      enum:    ['user', 'admin'],
      default: 'user',
    },
  },
  { timestamps: true }
);

// ─── Hash password before save 
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
});

// ─── Instance method: compare passwords 
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Remove sensitive fields from JSON output 
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);