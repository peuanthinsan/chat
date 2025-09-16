import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import avatarUpload from '../middleware/avatarUpload.js';
import { uploadFile, deleteFile } from '../utils/gcs.js';

const router = Router();

const generateAccessToken = user => (
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' })
);
const generateRefreshToken = (id) => jwt.sign({ id }, process.env.JWT_REFRESH, { expiresIn: '7d' });

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

router.post('/register', avatarUpload, async (req, res) => {
  const {
    email: rawEmail,
    password,
    username: rawUsername,
    firstName: rawFirstName,
    lastName: rawLastName
  } = req.body;

  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  const username = typeof rawUsername === 'string' ? rawUsername.trim().toLowerCase() : '';
  const firstName = typeof rawFirstName === 'string' ? rawFirstName.trim() : '';
  const lastName = typeof rawLastName === 'string' ? rawLastName.trim() : '';

  if (!email || !password || !username) {
    return res.status(400).json({ message: 'Email, username and password are required' });
  }

  if (!USERNAME_REGEX.test(username)) {
    return res.status(400).json({
      message: 'Username must be 3-30 characters and contain only letters, numbers or underscores'
    });
  }

  let avatarUrl;
  let user;

  try {
    const [emailExists, usernameExists] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ username })
    ]);
    if (emailExists) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    if (usernameExists) {
      return res.status(409).json({ message: 'Username already in use' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const adminExists = await User.exists({ role: 'admin' });
    const role = adminExists ? 'user' : 'admin';

    user = new User({ email, password: hashed, username, firstName, lastName, role });
    if (req.file) {
      try {
        avatarUrl = await uploadFile(req.file, `avatars/${user._id}-${Date.now()}`);
        user.avatarUrl = avatarUrl;
      } catch (err) {
        return res.status(500).json({ message: 'Failed to upload avatar' });
      }
    }

    await user.save();

    return res.status(201).json({
      id: user._id,
      email: user.email,
      role: user.role,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl
    });
  } catch (err) {
    if (avatarUrl) {
      try {
        await deleteFile(avatarUrl);
      } catch (cleanupErr) {
        console.error('Failed to cleanup avatar after registration error', cleanupErr);
      }
    }
    if (err?.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    if (err?.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0];
      const message = field === 'username' ? 'Username already in use' : 'Email already in use';
      return res.status(409).json({ message });
    }
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { identifier, email, username, password } = req.body;
  const loginValue = typeof identifier === 'string'
    ? identifier
    : (typeof email === 'string' ? email : (typeof username === 'string' ? username : ''));
  const normalizedIdentifier = loginValue.trim().toLowerCase();

  if (!normalizedIdentifier || !password) {
    return res.status(400).json({ message: 'Missing credentials' });
  }

  try {
    const user = await User.findOne({
      $or: [
        { email: normalizedIdentifier },
        { username: normalizedIdentifier }
      ]
    });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.role) {
      user.role = 'user';
      await user.save();
    }
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();
    res.cookie(
      'refreshToken',
      refreshToken,
      {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
      }
    );
    res.json({ accessToken });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/refresh', async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: 'No refresh token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH);
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== token) return res.status(403).json({ message: 'Invalid refresh token' });
    if (!user.role) {
      user.role = 'user';
      await user.save();
    }
    const accessToken = generateAccessToken(user);
    res.json({ accessToken });
  } catch (err) {
    res.status(403).json({ message: 'Invalid refresh token' });
  }
});

router.post('/logout', async (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH);
      const user = await User.findById(decoded.id);
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    } catch (err) {
      // ignore
    }
  }
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

export default router;
