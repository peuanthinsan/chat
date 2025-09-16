import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';
import avatarUpload from '../middleware/avatarUpload.js';
import { uploadFile, deleteFile } from '../utils/gcs.js';

const router = Router();

const sanitizeUser = user => {
  if (!user) return user;
  const sanitized = user.toObject();
  delete sanitized.password;
  delete sanitized.refreshToken;
  return sanitized;
};

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -refreshToken');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password -refreshToken').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

router.patch('/:id/role', auth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  try {
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (targetUser.role === 'admin' && role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'At least one admin is required' });
      }
    }

    targetUser.role = role;
    await targetUser.save();

    res.json(sanitizeUser(targetUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

router.delete('/:id', auth, requireAdmin, async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  if (id === req.userId) {
    return res.status(400).json({ message: 'Admins cannot delete themselves' });
  }

  try {
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (targetUser.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'At least one admin is required' });
      }
    }

    const sanitized = sanitizeUser(targetUser);

    if (targetUser.avatarUrl) {
      try {
        await deleteFile(targetUser.avatarUrl);
      } catch (err) {
        console.error('Failed to delete avatar while removing user', err);
      }
    }

    await targetUser.deleteOne();

    res.json({ message: 'User deleted', user: sanitized });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

router.patch('/me', auth, async (req, res) => {
  const { firstName, lastName } = req.body;
  const updates = {};

  if (typeof firstName !== 'undefined') updates.firstName = firstName;
  if (typeof lastName !== 'undefined') updates.lastName = lastName;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No updates provided' });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (Object.prototype.hasOwnProperty.call(updates, 'firstName')) {
      user.firstName = updates.firstName;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'lastName')) {
      user.lastName = updates.lastName;
    }

    await user.save();

    res.json(sanitizeUser(user));
  } catch (err) {
    if (err?.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

router.post('/avatar', auth, avatarUpload, async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file' });
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.avatarUrl) {
      try {
        await deleteFile(user.avatarUrl);
      } catch (err) {
        console.error(err);
      }
    }

    const url = await uploadFile(
      req.file,
      `avatars/${req.userId}-${Date.now()}`
    );
    user.avatarUrl = url;
    await user.save();

    res.json(sanitizeUser(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

export default router;
