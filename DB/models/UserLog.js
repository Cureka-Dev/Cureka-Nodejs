// models/UserLog.js

import mongoose from 'mongoose';

const userLogSchema = new mongoose.Schema({
  user_id: { type:Number},
  payload: { type: String },
  response: { type: String },
  type: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('UserLog', userLogSchema);
