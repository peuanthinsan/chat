import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export default async function auth(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(403).json({ message: 'Invalid token' });
  }

  try {
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    if (!user.role) {
      user.role = 'user';
      await user.save();
    }
    req.userId = user._id.toString();
    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}
