import { Router } from 'express';
import multer from 'multer';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import { uploadFile, deleteFile } from '../utils/gcs.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -refreshToken');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
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
