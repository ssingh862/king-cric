import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { User, toApi } from '../models';

const router = Router();

export function signToken(userId: string, version = 0) {
  return jwt.sign({ sub: userId, ver: version }, config.jwtSecret, { expiresIn: '30d' });
}

function profileFromUser(user: InstanceType<typeof User>) {
  const api = toApi(user);
  delete (api as Record<string, unknown>).password;
  return api;
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, avatar_url } = req.body as {
      email?: string;
      password?: string;
      full_name?: string;
      avatar_url?: string | null;
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) { res.status(400).json({ error: 'Enter a valid email address' }); return; }
    const existing = await User.findOne({ email: normalized });
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    let photo: string | null = null;
    if (avatar_url) {
      if (typeof avatar_url !== 'string' || avatar_url.length > 900000 || (!/^data:image\/(png|jpeg|webp);base64,/.test(avatar_url) && !/^https:\/\//.test(avatar_url))) {
        res.status(400).json({ error: 'Invalid photo' });
        return;
      }
      photo = avatar_url;
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalized,
      password: hash,
      full_name: full_name?.trim() || 'Cricket Fan',
      avatar_url: photo,
    });

    const token = signToken(String(user._id), user.token_version ?? 0);
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

    if (user.suspended) { res.status(403).json({ error: 'This account is suspended. Contact support.' }); return; }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Incorrect email or password' });
      return;
    }

    const token = signToken(String(user._id), user.token_version ?? 0);
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
  const allowed = ['full_name', 'phone', 'avatar_url', 'expo_push_token', 'city', 'playing_role', 'batting_style', 'bowling_style'] as const;
  for (const key of allowed) {
    const value = req.body[key];
    const max = key === 'avatar_url' ? 900000 : 200;
    if (value !== undefined && value !== null && (typeof value !== 'string' || value.length > max)) { res.status(400).json({error: 'Invalid profile field'}); return; }
  }
  if ('full_name' in req.body && !req.body.full_name?.trim()) { res.status(400).json({error: 'Name is required'}); return; }
  if (req.body.avatar_url && !/^data:image\/(png|jpeg|webp);base64,/.test(req.body.avatar_url) && !/^https:\/\//.test(req.body.avatar_url)) { res.status(400).json({error: 'Invalid photo'}); return; }
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
  res.status(501).json({ error: 'Email password recovery is not configured yet. Contact your tournament administrator.' });
});

export default router;
