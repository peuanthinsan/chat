import mongoose from 'mongoose';

const USERNAME_REGEX = /^[a-z0-9_]+$/;

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 30,
    match: USERNAME_REGEX
  },
  firstName: { type: String, trim: true, maxlength: 100, default: '' },
  lastName: { type: String, trim: true, maxlength: 100, default: '' },
  password: { type: String, required: true },
  avatarUrl: { type: String },
  refreshToken: { type: String },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  stripeCustomerId: { type: String, index: true },
  stripeSubscriptionId: { type: String, index: true },
  subscriptionStatus: { type: String, default: 'inactive' },
  subscriptionCurrentPeriodEnd: { type: Date },
  subscriptionCancelAt: { type: Date },
  subscriptionCancelAtPeriodEnd: { type: Boolean, default: false },
  subscriptionPriceId: { type: String }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
