import { Router } from 'express';
import multer from 'multer';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import { uploadFile } from '../utils/gcs.js';

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
    const url = await uploadFile(req.file, `avatars/${req.userId}`);
    const user = await User.findByIdAndUpdate(req.userId, { avatarUrl: url }, { new: true }).select('-password -refreshToken');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

export default router;
