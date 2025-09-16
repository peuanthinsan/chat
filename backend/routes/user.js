import { Router } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';
import { uploadFile, deleteFile } from '../utils/gcs.js';

const router = Router();
const MAX_AVATAR_SIZE_MB = 5;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    }
  }
});

const avatarUpload = (req, res, next) => {
  upload.single('avatar')(req, res, err => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: `Avatar must be ${MAX_AVATAR_SIZE_MB}MB or smaller` });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ message: 'Only image files are allowed' });
        }
        return res.status(400).json({ message: err.message });
      }
      return res.status(400).json({ message: err.message || 'Upload failed' });
    }
    next();
  });
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

    const sanitized = targetUser.toObject();
    delete sanitized.password;
    delete sanitized.refreshToken;

    res.json(sanitized);
  } catch (err) {
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

    const sanitized = user.toObject();
    delete sanitized.password;
    delete sanitized.refreshToken;
    res.json(sanitized);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

export default router;
