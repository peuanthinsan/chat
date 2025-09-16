import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import billingRoutes from './routes/billing.js';
import stripeWebhook from './routes/stripeWebhook.js';

dotenv.config();

const app = express();

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 8080;

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/billing', billingRoutes);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, '../frontend/dist')));
// Express 5 includes path-to-regexp v8, which requires wildcard segments to
// have a name. Use a named wildcard group to implement a catch-all route.
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
  })
  .catch(err => {
    console.error('DB connection error', err);
    process.exit(1);
  });
