import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { User, toApi } from '../models';

const router = Router();

function signToken(userId: string) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '30d' });
}

function profileFromUser(user: InstanceType<typeof User>) {
  const api = toApi(user);
  delete (api as Record<string, unknown>).password;
  return api;
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body as {
      email?: string;
      password?: string;
      full_name?: string;
    };

    if (!email?.trim() || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    const normalized = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalized });
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalized,
      password: hash,
      full_name: full_name?.trim() || 'Cricket Fan',
    });

    const token = signToken(String(user._id));
    res.status(201).json({
      token,
      user: profileFromUser(user),
      email: user.email,
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email?.trim() || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    if (!user) {
      res.status(401).json({ error: 'Incorrect email or password' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Incorrect email or password' });
      return;
    }

    const token = signToken(String(user._id));
    res.json({
      token,
      user: profileFromUser(user),
      email: user.email,
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: profileFromUser(user), email: user.email });
});

router.patch('/profile', requireAuth, async (req: AuthRequest, res) => {
  const allowed = ['full_name', 'phone', 'avatar_url', 'expo_push_token'] as const;
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }

  const user = await User.findByIdAndUpdate(req.userId, updates, { new: true });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: profileFromUser(user) });
});

router.post('/forgot-password', async (req, res) => {
  // Password reset via email is not implemented in this self-hosted stack yet.
  res.json({ message: 'If an account exists, reset instructions would be sent.' });
});

export default router;
