import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createSyncStore, type UserSyncRecord } from './syncStore.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp({ serveFrontend = true }: { serveFrontend?: boolean } = {}) {
  const app = express();
  // Small default body limit; only sync/QR uploads and AI image endpoints accept large bodies.
  const LARGE_BODY_ROUTES = new Set([
    '/api/cloud-sync/upload',
    '/api/cloud-sync/generate-qr',
    '/api/scan-medical',
    '/api/analyze-pet-document',
    '/api/analyze-food',
  ]);
  const smallJson = express.json({ limit: '1mb' });
  const largeJson = express.json({ limit: '25mb' });
  app.use((req, res, next) => (LARGE_BODY_ROUTES.has(req.path) ? largeJson : smallJson)(req, res, next));

  // Disable fingerprinting
  app.disable('x-powered-by');
  // Trust exactly one proxy hop (Cloud Run front end) so req.ip cannot be spoofed via X-Forwarded-For
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));

  const isProduction = process.env.NODE_ENV === 'production';
  // Vite dev server needs inline scripts (React refresh preamble) and its HMR websocket.
  const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src 'self' 'wasm-unsafe-eval' https://accounts.google.com https://apis.google.com https://www.gstatic.com${isProduction ? '' : " 'unsafe-inline'"}`,
    "style-src 'self' 'unsafe-inline' https://accounts.google.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://*.googleapis.com https://accounts.google.com https://nominatim.openstreetmap.org https://*.firebaseapp.com${isProduction ? '' : ' ws: wss:'}`,
    "frame-src https://accounts.google.com https://*.firebaseapp.com https://content.googleapis.com",
    "worker-src 'self' blob:",
    "media-src 'self' data: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  // HTTP security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(self), microphone=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('X-Frame-Options', 'DENY');
    if (isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    res.setHeader('Content-Security-Policy', contentSecurityPolicy);
    next();
  });

  // CORS: only the app's own web origins, Capacitor WebView and local development
  const allowedOrigins = new Set<string>([
    'capacitor://localhost',
    'https://localhost',
    'http://localhost',
    ...(process.env.APP_URL ? [process.env.APP_URL.replace(/\/$/, '')] : []),
    ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean) : []),
  ]);
  const isAllowedOrigin = (origin: string) =>
    allowedOrigins.has(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && isAllowedOrigin(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // In-memory sliding-window Rate Limiter to prevent DoS and Brute-force attacks
  interface RateLimitEntry {
    count: number;
    resetTime: number;
  }
  function createRateLimiter(options: { windowMs: number; max: number; message: string }) {
    const store = new Map<string, RateLimitEntry>();
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
      const now = Date.now();
      if (store.size > 10000) {
        for (const [key, entry] of store) {
          if (now > entry.resetTime) store.delete(key);
        }
      }
      let record = store.get(ip);
      if (!record || now > record.resetTime) {
        record = { count: 1, resetTime: now + options.windowMs };
        store.set(ip, record);
        return next();
      }
      record.count++;
      if (record.count > options.max) {
        return res.status(429).json({ success: false, error: options.message });
      }
      next();
    };
  }

  const authLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 25,
    message: 'Zbyt wiele prób logowania. Odczekaj 5 minut przed kolejną próbą.',
  });

  const pairCodeLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000,
    max: 15,
    message: 'Zbyt wiele prób parowania kodem PIN. Odczekaj 5 minut.',
  });

  const aiScanLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000,
    max: 20,
    message: 'Przekroczono limit zapytań skanera AI. Odczekaj chwilę.',
  });

  // Global daily cap on Gemini calls so a leaked client or bot cannot exhaust the API budget.
  const AI_DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 1000);
  let aiBudget = { day: new Date().toISOString().slice(0, 10), used: 0 };
  const aiDailyBudget = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const today = new Date().toISOString().slice(0, 10);
    if (aiBudget.day !== today) aiBudget = { day: today, used: 0 };
    if (aiBudget.used >= AI_DAILY_LIMIT) {
      return res.status(429).json({ success: false, error: 'Dzienny limit analiz AI został wyczerpany. Spróbuj jutro.' });
    }
    aiBudget.used++;
    next();
  };

  const syncStore = createSyncStore(process.env.SYNC_DATA_DIR || path.resolve(__dirname, 'data'));
  console.log(`Cloud sync storage: ${syncStore.kind}`);

  function tokensMatch(provided: unknown, stored: string | undefined): boolean {
    if (typeof provided !== 'string' || !stored) return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(stored);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  const MAX_TOKEN_AGE = 60 * 24 * 60 * 60 * 1000;
  const MAX_SESSIONS_PER_USER = 10;
  const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

  function issueSessionToken(user: UserSyncRecord): string {
    const token = 'tok_' + crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const active = (user.sessions || []).filter((s) => now - s.createdAt < MAX_TOKEN_AGE);
    active.push({ hash: hashToken(token), createdAt: now });
    user.sessions = active.slice(-MAX_SESSIONS_PER_USER);
    delete user.token;
    delete user.tokenCreatedAt;
    return token;
  }

  type SessionCheck = 'valid' | 'invalid' | 'expired';

  /** Verifies a session token; migrates a legacy plaintext token to a hashed session (caller persists `user`). */
  function checkSession(user: UserSyncRecord | undefined, provided: unknown): SessionCheck {
    if (!user || typeof provided !== 'string' || !provided) return 'invalid';
    const now = Date.now();
    const providedHash = hashToken(provided);
    const match = (user.sessions || []).find((s) => tokensMatch(providedHash, s.hash));
    if (match) return now - match.createdAt > MAX_TOKEN_AGE ? 'expired' : 'valid';
    if (user.token && tokensMatch(provided, user.token)) {
      const createdAt = user.tokenCreatedAt || now;
      if (now - createdAt > MAX_TOKEN_AGE) return 'expired';
      user.sessions = [...(user.sessions || []), { hash: providedHash, createdAt }].slice(-MAX_SESSIONS_PER_USER);
      delete user.token;
      delete user.tokenCreatedAt;
      return 'valid';
    }
    return 'invalid';
  }

  const sessionError = (check: SessionCheck) =>
    check === 'expired'
      ? 'Twoja sesja wygasła ze względów bezpieczeństwa. Zaloguj się ponownie.'
      : 'Brak autoryzacji sesji. Zaloguj się ponownie.';

  // Enterprise PBKDF2 Password Hashing (100,000 iterations, SHA-512, 32-byte salt)
  function hashPasswordPbkdf2(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  }

  // Timing-safe password verification with automatic legacy algorithm upgrade
  function verifyPasswordSecurely(
    password: string,
    storedHash: string,
    salt?: string,
    algorithm?: string
  ): { isValid: boolean; needsRehash: boolean } {
    if (!storedHash) return { isValid: false, needsRehash: false };

    // Standard A: PBKDF2-SHA-512 (128 hex characters = 64 bytes)
    if (algorithm === 'pbkdf2-sha512' || storedHash.length === 128) {
      const computed = hashPasswordPbkdf2(password, salt || '');
      const bufA = Buffer.from(computed, 'hex');
      const bufB = Buffer.from(storedHash, 'hex');
      if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
        return { isValid: true, needsRehash: false };
      }
      return { isValid: false, needsRehash: false };
    }

    // Standard B: Legacy HMAC-SHA256 with salt (64 hex characters)
    if (salt && salt.length > 0) {
      const legacyHash = crypto.createHmac('sha256', salt).update(password).digest('hex');
      const bufA = Buffer.from(legacyHash, 'hex');
      const bufB = Buffer.from(storedHash, 'hex');
      if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
        return { isValid: true, needsRehash: true }; // Upgraded on successful login!
      }
    }

    // Standard C: Legacy unsalted HMAC-SHA256
    const legacyUnsalted = crypto.createHmac('sha256', '').update(password).digest('hex');
    const bufC = Buffer.from(legacyUnsalted, 'hex');
    const bufStored = Buffer.from(storedHash, 'hex');
    if (bufC.length === bufStored.length && crypto.timingSafeEqual(bufC, bufStored)) {
      return { isValid: true, needsRehash: true };
    }

    return { isValid: false, needsRehash: false };
  }

  let firebaseConfig: { apiKey?: string; oAuthClientId?: string } = {};
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'firebase-applet-config.json'), 'utf8'));
  } catch {}

  const GOOGLE_ALLOWED_AUDIENCES: string[] = [
    '764412082432-q5d25pi0er4lnevgagscd26h7mkm8kcb.apps.googleusercontent.com',
    '790254321655-2irfb1normmrbsi2nh34oiv5oob6rhnf.apps.googleusercontent.com',
    ...(firebaseConfig.oAuthClientId ? [firebaseConfig.oAuthClientId] : []),
    ...(process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.split(',').map((id) => id.trim()) : []),
  ];

  // Cryptographic token verification for Google OAuth 2.0 / OpenID Connect & Firebase Auth
  async function verifyGoogleOrFirebaseToken(idToken: string): Promise<{
    email: string;
    name?: string;
    avatar?: string;
    sub: string;
  } | null> {
    if (!idToken || typeof idToken !== 'string') return null;

    // 1. Check with Firebase Identity Toolkit endpoint (for tokens from Firebase Client SDK)
    try {
      const firebaseApiKey = process.env.FIREBASE_API_KEY || firebaseConfig.apiKey;
      if (!firebaseApiKey) throw new Error('Brak FIREBASE_API_KEY');
      const fbRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (fbRes.ok) {
        const fbData: any = await fbRes.json();
        const fbUser = fbData.users?.[0];
        if (fbUser && fbUser.email) {
          return {
            email: fbUser.email.toLowerCase(),
            name: fbUser.displayName || fbUser.email.split('@')[0],
            avatar: fbUser.photoUrl || '',
            sub: fbUser.localId,
          };
        }
      }
    } catch (err) {
      console.warn('Firebase token verification lookup warning:', err);
    }

    // 2. Check with Google tokeninfo endpoint (for tokens directly from Google Sign-In SDK on Android or Web)
    try {
      const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      if (gRes.ok) {
        const gData: any = await gRes.json();
        if (
          gData.email &&
          (gData.email_verified === 'true' || gData.email_verified === true) &&
          GOOGLE_ALLOWED_AUDIENCES.includes(gData.aud)
        ) {
          return {
            email: gData.email.toLowerCase(),
            name: gData.name || gData.email.split('@')[0],
            avatar: gData.picture || '',
            sub: gData.sub,
          };
        }
      }
    } catch (err) {
      console.warn('Google tokeninfo verification lookup warning:', err);
    }

    // 3. Fallback: Local cryptographic verification using google-auth-library
    try {
      const { OAuth2Client } = await import('google-auth-library');
      const client = new OAuth2Client();
      const ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_ALLOWED_AUDIENCES,
      });
      const payload = ticket.getPayload();
      if (payload && payload.email) {
        return {
          email: payload.email.toLowerCase(),
          name: payload.name || payload.email.split('@')[0],
          avatar: payload.picture || '',
          sub: payload.sub,
        };
      }
    } catch (err) {
      // Ignored if invalid token
    }

    return null;
  }

  // Cryptographic Google Access Token verification via Google UserInfo API
  async function verifyGoogleAccessToken(accessToken: string): Promise<{
    email: string;
    name?: string;
    avatar?: string;
    sub: string;
  } | null> {
    if (!accessToken || typeof accessToken !== 'string') return null;
    try {
      const gRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (gRes.ok) {
        const gData: any = await gRes.json();
        if (gData.email && (gData.email_verified === true || gData.email_verified === 'true')) {
          return {
            email: gData.email.toLowerCase(),
            name: gData.name || gData.email.split('@')[0],
            avatar: gData.picture || '',
            sub: gData.sub,
          };
        }
      }
    } catch (err) {
      console.warn('Google accessToken verification lookup warning:', err);
    }
    return null;
  }

  // API Route: Cloud Sync Auth (Login, Register, Google) with Rate Limiting
  app.post('/api/cloud-sync/auth', authLimiter, async (req, res) => {
    try {
      const { email, password, name, avatar, provider, action, idToken, accessToken } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ success: false, error: 'Wymagany jest poprawny adres e-mail.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail.includes('@') || normalizedEmail.length < 5) {
        return res.status(400).json({ success: false, error: 'Podany adres e-mail jest nieprawidłowy.' });
      }

      let user = await syncStore.getUser(normalizedEmail);

      // 1. Google Provider Sign-in (Cryptographically verified ID Token or OAuth2 Access Token)
      if (provider === 'google' || action === 'google') {
        let isAuthorized = false;
        let verifiedName = name || '';
        let verifiedAvatar = avatar || '';

        // Case A: Verified Google / Firebase JWT idToken
        if (idToken && typeof idToken === 'string') {
          const verifiedUser = await verifyGoogleOrFirebaseToken(idToken);
          if (verifiedUser && verifiedUser.email === normalizedEmail) {
            isAuthorized = true;
            if (verifiedUser.name) verifiedName = verifiedUser.name;
            if (verifiedUser.avatar) verifiedAvatar = verifiedUser.avatar;
          }
        }

        // Case B: Verified Google OAuth2 Access Token (e.g. from Native Android Google Sign-In)
        if (!isAuthorized && accessToken && typeof accessToken === 'string') {
          const verifiedUser = await verifyGoogleAccessToken(accessToken);
          if (verifiedUser && verifiedUser.email === normalizedEmail) {
            isAuthorized = true;
            if (verifiedUser.name) verifiedName = verifiedUser.name;
            if (verifiedUser.avatar) verifiedAvatar = verifiedUser.avatar;
          }
        }

        if (!isAuthorized) {
          return res.status(401).json({
            success: false,
            error: 'Błąd autoryzacji konta Google. Wymagany jest zweryfikowany token Google.',
          });
        }

        const effectiveName = verifiedName || name || normalizedEmail.split('@')[0];
        const effectiveAvatar = verifiedAvatar || avatar || '';

        if (!user) {
          user = {
            email: normalizedEmail,
            name: effectiveName,
            avatar: effectiveAvatar,
            provider: 'google',
            lastSyncTime: null,
            petCount: 0,
            payload: {
              version: '2.5.0',
              pets: [],
              vaccinations: [],
              medications: [],
              exams: [],
              conditions: [],
              visits: []
            }
          };
        } else {
          if (effectiveName) user.name = effectiveName;
          if (effectiveAvatar) user.avatar = effectiveAvatar;
          user.provider = 'google';
        }
        const sessionToken = issueSessionToken(user);
        await syncStore.putUser(user);

        return res.json({
          success: true,
          token: sessionToken,
          user: {
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            provider: user.provider || 'google'
          },
          petCount: user.petCount || user.payload?.pets?.length || 0,
          lastSyncTime: user.lastSyncTime,
          payload: user.payload || { pets: [] }
        });
      }

      // 2. Email + Password: Registration
      if (action === 'register') {
        if (user && user.passwordHash) {
          return res.status(400).json({ 
            success: false, 
            error: 'Konto o tym adresie e-mail już istnieje. Przejdź do zakładki logowania.' 
          });
        }
        if (!password || typeof password !== 'string' || password.length < 6) {
          return res.status(400).json({ 
            success: false, 
            error: 'Hasło musi mieć co najmniej 6 znaków.' 
          });
        }

        const salt = crypto.randomBytes(32).toString('hex');
        const passwordHash = hashPasswordPbkdf2(password, salt);

        user = {
          email: normalizedEmail,
          passwordHash,
          salt,
          hashAlgorithm: 'pbkdf2-sha512',
          name: name ? String(name).slice(0, 100) : normalizedEmail.split('@')[0],
          avatar: avatar ? String(avatar).slice(0, 500) : '',
          provider: 'email',
          lastSyncTime: null,
          petCount: 0,
          payload: {
            version: '2.5.0',
            pets: [],
            vaccinations: [],
            medications: [],
            exams: [],
            conditions: [],
            visits: []
          }
        };
        const sessionToken = issueSessionToken(user);
        await syncStore.putUser(user);

        return res.json({
          success: true,
          token: sessionToken,
          user: {
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            provider: 'email'
          },
          petCount: 0,
          lastSyncTime: null,
          payload: user.payload
        });
      }

      // 3. Email + Password: Login
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: 'Nie znaleziono konta z tym adresem. Utwórz nowe konto.' 
        });
      }

      if (!password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Podaj hasło do swojego konta.' 
        });
      }

      // Timing-safe verification with automatic algorithm upgrade
      const authResult = verifyPasswordSecurely(
        password,
        user.passwordHash || '',
        user.salt,
        user.hashAlgorithm
      );

      if (!authResult.isValid) {
        return res.status(401).json({ 
          success: false, 
          error: 'Nieprawidłowe hasło dla tego konta.' 
        });
      }

      // Seamlessly upgrade legacy SHA-256 hashes to PBKDF2-SHA512 upon successful login
      if (authResult.needsRehash) {
        const newSalt = crypto.randomBytes(32).toString('hex');
        user.passwordHash = hashPasswordPbkdf2(password, newSalt);
        user.salt = newSalt;
        user.hashAlgorithm = 'pbkdf2-sha512';
      }

      const sessionToken = issueSessionToken(user);
      await syncStore.putUser(user);

      return res.json({
        success: true,
        token: sessionToken,
        user: {
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          provider: user.provider || 'email'
        },
        petCount: user.petCount || user.payload?.pets?.length || 0,
        lastSyncTime: user.lastSyncTime,
        payload: user.payload || { pets: [] }
      });
    } catch (err: any) {
      console.error('Cloud Sync Auth error:', err);
      return res.status(500).json({ success: false, error: 'Wystąpił błąd podczas autoryzacji konta.' });
    }
  });

  // API Route: Upload PetCare data to Cloud (Authorized only for own data)
  app.post('/api/cloud-sync/upload', async (req, res) => {
    try {
      const { email, token, payload, petCount } = req.body;
      if (!email || !payload || typeof payload !== 'object') {
        return res.status(400).json({ success: false, error: 'Nieprawidłowe lub brakujące dane do synchronizacji.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const user = await syncStore.getUser(normalizedEmail);

      const session = checkSession(user, token);
      if (!user || session !== 'valid') {
        return res.status(401).json({ success: false, error: sessionError(session) });
      }

      const now = new Date().toISOString();
      user.payload = payload;
      user.petCount = typeof petCount === 'number' ? petCount : (payload.pets?.length || 0);
      user.lastSyncTime = now;
      await syncStore.putUser(user);

      return res.json({
        success: true,
        lastSyncTime: now,
        petCount: user.petCount,
      });
    } catch (err: any) {
      console.error('Cloud Sync Upload error:', err);
      return res.status(500).json({ success: false, error: 'Błąd zapisu danych w chmurze.' });
    }
  });

  // API Route: Download PetCare data from Cloud (Authorized only for own data)
  app.post('/api/cloud-sync/download', async (req, res) => {
    try {
      const { email, token } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Brak adresu e-mail.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const user = await syncStore.getUser(normalizedEmail);

      if (!user) {
        return res.status(404).json({ success: false, error: 'Nie znaleziono konta w chmurze.' });
      }

      const hadLegacyToken = Boolean(user.token);
      const session = checkSession(user, token);
      if (session !== 'valid') {
        return res.status(401).json({ success: false, error: sessionError(session) });
      }
      if (hadLegacyToken && !user.token) {
        await syncStore.putUser(user);
      }

      return res.json({
        success: true,
        payload: user.payload || { pets: [] },
        lastSyncTime: user.lastSyncTime || new Date().toISOString(),
        petCount: user.petCount || user.payload?.pets?.length || 0,
      });
    } catch (err: any) {
      console.error('Cloud Sync Download error:', err);
      return res.status(500).json({ success: false, error: 'Błąd pobierania danych z chmury.' });
    }
  });

  const MAX_QR_TRANSFERS = 200;

  // API Route: Generate a QR Code Transfer with all pet data and attachments
  app.post('/api/cloud-sync/generate-qr', pairCodeLimiter, async (req, res) => {
    try {
      const { payload, email } = req.body;
      if (!payload) {
        return res.status(400).json({ success: false, error: 'Brak danych do synchronizacji QR.' });
      }

      const nowTs = Date.now();
      if ((await syncStore.pruneTransfers(nowTs)) >= MAX_QR_TRANSFERS) {
        return res.status(503).json({ success: false, error: 'Serwer jest chwilowo przeciążony. Spróbuj ponownie za kilka minut.' });
      }

      const qrId = 'pc_sync_' + crypto.randomBytes(16).toString('hex');
      const petCount = Array.isArray(payload.pets) ? payload.pets.length : 0;
      const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes

      await syncStore.putTransfer({
        id: qrId,
        payload,
        petCount,
        email: email || 'user@petcare.app',
        expiresAt,
        createdAt: new Date().toISOString(),
      });

      const qrData = JSON.stringify({
        type: 'petcare_qr_sync',
        id: qrId,
        pets: petCount,
        v: 2,
      });

      return res.json({
        success: true,
        qrId,
        qrData,
        expiresAt,
        petCount,
      });
    } catch (err: any) {
      console.error('Error in /api/cloud-sync/generate-qr:', err);
      return res.status(500).json({ success: false, error: 'Błąd generowania kodu QR.' });
    }
  });

  // API Route: Redeem QR Code Transfer on the second device
  app.post('/api/cloud-sync/redeem-qr', pairCodeLimiter, async (req, res) => {
    try {
      const { qrId, code } = req.body;
      const targetId = qrId || code;

      if (!targetId) {
        return res.status(400).json({ success: false, error: 'Brak identyfikatora kodu QR.' });
      }

      // Try QR Transfers map first
      const record = typeof targetId === 'string' ? await syncStore.getTransfer(targetId) : undefined;
      if (record) {
        if (Date.now() > record.expiresAt) {
          await syncStore.deleteTransfer(targetId);
          return res.status(410).json({ success: false, error: 'Ten kod QR wygasł (ważny przez 30 minut). Wygeneruj nowy na pierwszym telefonie.' });
        }

        return res.json({
          success: true,
          payload: record.payload,
          petCount: record.petCount,
          lastSyncTime: record.createdAt,
        });
      }

      // Fallback: 6-digit pairCode (single use, limited lifetime)
      const u = typeof targetId === 'string' ? await syncStore.findUserByPairCode(targetId) : undefined;
      if (u?.pairCode) {
        const expired = Date.now() > u.pairCode.expiresAt;
        delete u.pairCode;
        await syncStore.putUser(u);
        if (expired) {
          return res.status(410).json({ success: false, error: 'Kod wygasł. Wygeneruj nowy na pierwszym urządzeniu.' });
        }
        return res.json({
          success: true,
          payload: u.payload,
          petCount: u.petCount,
          lastSyncTime: u.lastSyncTime || new Date().toISOString(),
        });
      }

      return res.status(404).json({ success: false, error: 'Nie znaleziono danych dla tego kodu QR lub kod wygasł.' });
    } catch (err: any) {
      console.error('Error in /api/cloud-sync/redeem-qr:', err);
      return res.status(500).json({ success: false, error: 'Błąd pobierania danych przez kod QR.' });
    }
  });

  // API Route: Generate a 6-digit Quick Pair PIN
  app.post('/api/cloud-sync/generate-code', async (req, res) => {
    try {
      const { email, token } = req.body;
      const normalizedEmail = (email || '').trim().toLowerCase();
      const user = await syncStore.getUser(normalizedEmail);

      if (!user || checkSession(user, token) !== 'valid') {
        return res.status(403).json({ success: false, error: 'Wymagane logowanie do wygenerowania kodu.' });
      }

      // Generate cryptographically secure 6-digit random code
      const code = crypto.randomInt(100000, 1000000).toString();
      user.pairCode = {
        code,
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins
        attempts: 0,
      };
      await syncStore.putUser(user);

      return res.json({ success: true, code, expiresAt: user.pairCode.expiresAt });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Błąd generowania kodu.' });
    }
  });

  // API Route: Pair and Restore using 6-digit PIN on any phone (with brute-force protection)
  app.post('/api/cloud-sync/pair-code', pairCodeLimiter, async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ success: false, error: 'Podaj 6-cyfrowy kod parowania.' });
      }

      const cleanCode = code.replace(/\D/g, '');
      const matchedUser = await syncStore.findUserByPairCode(cleanCode);
      if (matchedUser?.pairCode) {
        const expired = Date.now() > matchedUser.pairCode.expiresAt;
        delete matchedUser.pairCode;
        await syncStore.putUser(matchedUser);
        if (expired) {
          return res.status(410).json({ success: false, error: 'Ten kod parowania wygasł (ważny przez 15 minut). Wygeneruj nowy na pierwszym telefonie.' });
        }
      }

      if (!matchedUser) {
        return res.status(404).json({ success: false, error: 'Nieprawidłowy kod parowania lub kod już wygasł.' });
      }

      const pairedToken = issueSessionToken(matchedUser);
      await syncStore.putUser(matchedUser);

      return res.json({
        success: true,
        user: {
          email: matchedUser.email,
          name: matchedUser.name,
          avatar: matchedUser.avatar,
        },
        token: pairedToken,
        payload: matchedUser.payload,
        petCount: matchedUser.petCount,
        lastSyncTime: matchedUser.lastSyncTime,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Błąd parowania urządzeń.' });
    }
  });

  // API Route: Delete user account and all cloud data (GDPR / RODO Right to Erasure, Art. 17)
  app.delete('/api/cloud-sync/account', async (req, res) => {
    try {
      const { email, token } = req.body || {};
      if (!email || !token) {
        return res.status(400).json({ success: false, error: 'Wymagany jest email i token sesji.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const user = await syncStore.getUser(normalizedEmail);

      if (!user || checkSession(user, token) !== 'valid') {
        return res.status(401).json({ success: false, error: 'Brak autoryzacji do usunięcia tego konta.' });
      }

      await syncStore.deleteUser(normalizedEmail);

      return res.json({ success: true, message: 'Konto i wszystkie dane w chmurze zostały pomyślnie usunięte.' });
    } catch (err: any) {
      console.error('Error deleting account:', err);
      return res.status(500).json({ success: false, error: 'Błąd usuwania konta.' });
    }
  });

  // API Route: AI Medical & Prescription Scanner
  app.post('/api/scan-medical', aiScanLimiter, aiDailyBudget, async (req, res) => {
    const { imageBase64, mimeType, petSpecies, petName, petWeightKg, deepDecipherMode } = req.body || {};

    try {
      if (!imageBase64) {
        return res.status(400).json({ success: false, error: 'Brak danych zdjęcia' });
      }

      // Sanitize prompt text parameters against prompt injection
      const cleanPetName = typeof petName === 'string' ? petName.replace(/[^\p{L}\p{N}\s._-]/gu, '').slice(0, 50) : 'pacjent';
      const cleanPetSpecies = typeof petSpecies === 'string' ? petSpecies.replace(/[^\p{L}\p{N}\s._-]/gu, '').slice(0, 50) : 'pies/kot';
      const cleanWeight = typeof petWeightKg === 'number' || typeof petWeightKg === 'string' ? String(petWeightKg).replace(/[^\d.,]/g, '').slice(0, 10) : '';

      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error: 'Brak klucza API Gemini (GEMINI_API_KEY). Skonfiguruj klucz w ustawieniach środowiska, aby analizować recepty.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
      const effectiveMime = mimeMatch ? mimeMatch[1] : (mimeType || 'image/jpeg');
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

      const prompt = `Jesteś najwyższej klasy weterynaryjnym ekspertem OCR, transkrypcji wizyt, recept i analizy dokumentacji zwierząt.
Twoim nadrzędnym zadaniem jest INTELIGENTNE I BEZBŁĘDNE ROZPOZNANIE DOKUMENTU W KAŻDYCH WARUNKACH:
- Odręcznych zapisków i bazgrołów lekarza (np. "2 x 1/2 tabl", "co 12h", "na czczo"),
- Słabego oświetlenia, cieni, żółtego światła, zagięć papieru czy przedmiotów trzymających kartkę (np. brelok, klucze),
- Każdego typu dokumentu: Karta informacyjna wizyty, wypis, zalecenia lekarskie, recepta, wyniki krwi/moczu/USG, etykiety leków.

KONTEKST PACJENTA W APLIKACJI:
- Imię: ${cleanPetName}
- Gatunek: ${cleanPetSpecies}
- Waga: ${cleanWeight ? `${cleanWeight} kg` : 'nieznana'}

ZASADY ANALIZY:
1. JEŚLI NA ZDJĘCIU JEST DOKUMENT WETERYNARYJNY (karta wizyty, zalecenia, recepta, wyniki):
   - ZAWSZE ustaw "isValidMedicalDocument": true!
2. WYKRYJ LEKI:
   - Pełna nazwa (np. "FORTHYRON 800 mg (Lewotyroksyna sodowa)"),
   - Dokładna dawka z druku oraz z ręcznych dopisków lekarza (np. "1/2 tabletki 2 x dziennie"),
   - Szczegółowe instrukcje (np. "Podawać co 12 h o stałych porach, ok. pół godziny przed posiłkiem na czczo"),
   - Czy lek przewlekły (np. na tarczycę/Forthyron -> isChronic: true),
   - Godziny podania (np. 2x dziennie -> ["08:00", "20:00"]).
3. WYKRYJ DANE WIZYTY I DIAGNOZĘ:
   - Rozpoznanie/diagnoza (np. "Niedoczynność tarczycy"),
   - Zalecenia kliniczne (np. objawy przedawkowania, stałe pory, leczenie do końca życia),
   - Kontrola (np. "Kontrola hormonów tarczycy we krwi po 4-6 tygodniach, 4-6h po porannej dawce na czczo"),
   - Dane lekarza (np. Mirosława Lewicka, tel. 0605 632 588, Mikołów),
   - Data wizyty: UWAGA! W Polsce daty zapisuje się w formacie Dzień/Miesiąc/Rok (DD/MM/YYYY). Zapis np. '12/03/2026 11:39' oznacza BEZWZGLĘDNIE 12 MARCA 2026 ROKU (zwróć w visitInfo.date jako "2026-03-12", nigdy jako grudzień!).
4. WYKRYJ DANE ZWIERZĘCIA Z NAGŁÓWKA:
   - Imię pacjenta, gatunek, rasa, wiek, maść, płeć jeśli są na dokumencie.

Zwróć WYŁĄCZNIE poprawny format JSON w schemacie:
{
  "isValidMedicalDocument": boolean,
  "type": "medication" | "exam_blood" | "visit_recommendation" | "invalid",
  "title": string,
  "summary": string,
  "confidence": "high" | "medium" | "estimated",
  "detectedRawText": string,
  "diagnosis": string,
  "visitInfo": {
    "date": string,
    "clinicName": string,
    "doctorName": string,
    "doctorPhone": string,
    "city": string
  },
  "detectedPet": {
    "name": string,
    "species": string,
    "breed": string,
    "age": string,
    "gender": string,
    "color": string
  },
  "recommendations": string[],
  "nextCheckup": {
    "description": string,
    "timeframeWeeks": string
  },
  "medications": [
    {
      "name": string,
      "dosage": string,
      "instructions": string,
      "form": "tablet" | "capsule" | "liquid" | "drops" | "ointment" | "injection" | "other",
      "isChronic": boolean,
      "suggestedHours": string[]
    }
  ],
  "examParameters": [
    {
      "name": string,
      "value": string,
      "unit": string,
      "refRange": string,
      "status": "normal" | "attention" | "abnormal"
    }
  ],
  "doctorNotes": string
}`;

      const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      let response: any = null;
      let lastModelError: any = null;

      for (const modelName of CANDIDATE_MODELS) {
        try {
          console.log(`[AI Scanner] Próba zaawansowanej analizy modelem: ${modelName}`);
          
          const requestConfig: any = {
            responseMimeType: 'application/json',
          };

          response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      data: cleanBase64,
                      mimeType: effectiveMime,
                    },
                  },
                  { text: prompt },
                ],
              },
            ],
            config: requestConfig,
          });
          if (response && response.text) {
            console.log(`[AI Scanner] Sukces z modelem: ${modelName}`);
            break;
          }
        } catch (mErr: any) {
          console.warn(`[AI Scanner] Błąd dla modelu ${modelName}:`, mErr?.message || mErr);
          lastModelError = mErr;
          // Continue to next model in list
        }
      }

      if (!response || !response.text) {
        throw new Error(lastModelError?.message || 'Nie udało się uzyskać odpowiedzi od żadnego modelu AI.');
      }

      const responseText = response.text || '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(responseText.trim());
      } catch (parseErr) {
        console.error('Błąd parsowania JSON z Gemini:', parseErr, responseText);
        return res.status(500).json({
          success: false,
          error: 'Nie udało się zinterpretować odpowiedzi modelu AI.',
        });
      }

      // Auto-validate medical document flag if meaningful medical content exists
      const hasMeds = Array.isArray(parsed.medications) && parsed.medications.length > 0;
      const hasExams = Array.isArray(parsed.examParameters) && parsed.examParameters.length > 0;
      const hasDiagnosis = typeof parsed.diagnosis === 'string' && parsed.diagnosis.trim().length > 0;
      const hasNotes = typeof parsed.doctorNotes === 'string' && parsed.doctorNotes.trim().length > 10;
      const hasRecs = Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0;
      const hasVisit = parsed.visitInfo && (parsed.visitInfo.doctorName || parsed.visitInfo.date);

      if (hasMeds || hasExams || hasDiagnosis || hasNotes || hasRecs || hasVisit) {
        parsed.isValidMedicalDocument = true;
        if (!parsed.type || parsed.type === 'invalid') {
          parsed.type = hasMeds ? 'medication' : hasExams ? 'exam_blood' : 'visit_recommendation';
        }
      }

      // Normalize visit date if in Polish DD/MM/YYYY format
      if (parsed.visitInfo && parsed.visitInfo.date) {
        const rawDate = String(parsed.visitInfo.date).trim();
        const dmy = rawDate.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
        if (dmy) {
          const day = dmy[1].padStart(2, '0');
          const month = dmy[2].padStart(2, '0');
          const year = dmy[3];
          parsed.visitInfo.date = `${year}-${month}-${day}`;
        }
      }

      if (!Array.isArray(parsed.medications)) parsed.medications = [];
      if (!Array.isArray(parsed.examParameters)) parsed.examParameters = [];
      if (!Array.isArray(parsed.recommendations)) parsed.recommendations = [];

      return res.json({
        success: true,
        extracted: parsed,
      });
    } catch (err: any) {
      console.error('Błąd skanowania medycznego Gemini:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Wystąpił błąd podczas analizy obrazu przez AI.',
      });
    }
  });

  // API Route: AI Pet Food & Document Analyzer (Food Lens AI)
  app.post(['/api/analyze-pet-document', '/api/analyze-food'], aiScanLimiter, aiDailyBudget, async (req, res) => {
    const { imageBase64, mimeType, petSpecies, petName, petAllergies, customPrompt } = req.body || {};

    try {
      if (!imageBase64) {
        return res.status(400).json({ success: false, error: 'Brak danych zdjęcia karmy.' });
      }

      const cleanPetName = typeof petName === 'string' ? petName.replace(/[^\p{L}\p{N}\s._-]/gu, '').slice(0, 50) : 'zwierzak';
      const cleanPetSpecies = typeof petSpecies === 'string' ? petSpecies.replace(/[^\p{L}\p{N}\s._-]/gu, '').slice(0, 50) : 'pies/kot';
      const cleanAllergies = typeof petAllergies === 'string' ? petAllergies.slice(0, 200) : '';

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error: 'Brak klucza API Gemini (GEMINI_API_KEY).',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' },
        },
      });

      const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
      const effectiveMime = mimeMatch ? mimeMatch[1] : (mimeType || 'image/jpeg');
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

      const prompt = customPrompt || `Jesteś dietetykiem zwierzęcym i ekspertem analizy etykiet karm dla psów i kotów.
Twoim zadaniem jest dokładne odczytanie ze zdjęcia opakowania karmy listy składników (ingredients) oraz składu analitycznego (analytical constituents: białko, tłuszcz, włókno, popiół, wilgotność).

KONTEKST PACJENTA:
- Imię: ${cleanPetName}
- Gatunek: ${cleanPetSpecies}
- Zdefiniowane alergie w profilu: ${cleanAllergies || 'brak zdefiniowanych alergii'}

WYTYCZNE DLA ANALIZY:
1. "ingredientsText": Przepisz DOKŁADNIE i wiernie całą listę składników z opakowania w języku polskim. Jeśli etykieta jest wielojęzyczna, wybierz wersję polską (lub przetłumacz na polski).
2. "analyticalText": Przepisz skład analityczny (białko surowe, tłuszcz surowy, włókno, popiół, wapń, fosfor itp.).
3. "meatPercentage": Oszacuj procent mięsa (np. "65%" lub "brak danych na etykiecie").
4. "meatQuality": Oceń jakość ("Bardzo wysoka: transparentne mięso spożywcze", "Wysoka: sprecyzowane mięso i podroby", "Średnia: mięso i produkty pochodzenia zwierzęcego", "Niska: mączki i odpady rzeźne").
5. "grainFree": Czy karma jest bezzbożowa (true/false).
6. "allergensDetected": Składniki karmy kolidujące z alergiami zwierzaka (${cleanAllergies}). Jeśli np. pupil ma alergię na kurczaka, a w składzie jest tłuszcz drobiowy lub mączka z kurczaka -> dodaj to do listy!
7. "fillers": Wypisz wykryte tanie wypełniacze (np. wysłodki buraczane, kukurydza, pszenica, soja, cukier, karmel).
8. "macronutrients": { "protein": string, "fat": string, "carbs": string, "moisture": string }
9. "safeStatus": "safe" (jeśli brak kolizji), "warning" (jeśli słaby skład lub wypełniacze), "danger" (jeśli wykryto alergen groźny dla tego pupila).
10. "summary": Zwięzłe, fachowe podsumowanie karmy w 2-3 zdaniach.

Zwróć WYŁĄCZNIE poprawny obiekt JSON:
{
  "productName": string,
  "foodType": "sucha" | "mokra" | "przysmak" | "inna",
  "ingredientsText": string,
  "analyticalText": string,
  "meatPercentage": string,
  "meatQuality": string,
  "grainFree": boolean,
  "allergensDetected": string[],
  "fillers": string[],
  "macronutrients": {
    "protein": string,
    "fat": string,
    "carbs": string,
    "moisture": string
  },
  "safeStatus": "safe" | "warning" | "danger",
  "summary": string,
  "text": string
}`;

      const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      let response: any = null;
      let lastModelError: any = null;

      for (const modelName of CANDIDATE_MODELS) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      data: cleanBase64,
                      mimeType: effectiveMime,
                    },
                  },
                  { text: prompt },
                ],
              },
            ],
            config: {
              responseMimeType: 'application/json',
            },
          });
          if (response && response.text) break;
        } catch (mErr: any) {
          lastModelError = mErr;
        }
      }

      if (!response || !response.text) {
        throw new Error(lastModelError?.message || 'Nie udało się uzyskać odpowiedzi od modelu AI.');
      }

      let parsed: any;
      try {
        parsed = JSON.parse(response.text.trim());
      } catch {
        parsed = {
          text: response.text,
          ingredientsText: response.text,
          summary: 'Odczytano etykietę karmy.',
          safeStatus: 'safe',
          allergensDetected: [],
          fillers: [],
          grainFree: true,
          macronutrients: { protein: 'b/d', fat: 'b/d', carbs: 'b/d' },
        };
      }

      if (!parsed.text && parsed.ingredientsText) {
        parsed.text = parsed.ingredientsText;
      }

      return res.json({
        success: true,
        ...parsed,
      });
    } catch (err: any) {
      console.error('Błąd analizy karmy Gemini:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Wystąpił błąd podczas analizy obrazu przez AI.',
      });
    }
  });

  // In-memory cache for fast Geocoding and Reverse Geocoding
  const geocodeCache = new Map<string, any>();
  const reverseGeocodeCache = new Map<string, any>();

  // API Route: Geocode any Polish city, town, village, or gmina
  app.get('/api/geocode', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (!q || q.length < 2) {
        return res.json({ success: true, results: [] });
      }

      const cacheKey = q.toLowerCase();
      if (geocodeCache.has(cacheKey)) {
        return res.json({ success: true, results: geocodeCache.get(cacheKey) });
      }

      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=pl&addressdetails=1&limit=8&q=${encodeURIComponent(q)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PetCare-Veterinary-App/2.0 (contact: baluch.arek@gmail.com)',
          'Accept-Language': 'pl,en',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        return res.status(502).json({ success: false, error: 'Błąd dostawcy map' });
      }

      const data = await response.json();
      const results = (Array.isArray(data) ? data : []).map((item: any) => {
        const addr = item.address || {};
        const rawName = addr.village || addr.town || addr.city || addr.hamlet || addr.suburb || item.name || q;
        const gmina = (addr.municipality || '').replace(/^gmina\s+/i, '');
        const county = addr.county || '';
        const voivodeship = (addr.state || '').replace(/^województwo\s+/i, '');
        
        let type = 'miejscowość';
        if (addr.village || item.type === 'village' || item.type === 'hamlet') type = 'wieś';
        else if (addr.town || item.type === 'town') type = 'miasto';
        else if (addr.city || item.type === 'city') type = 'miasto';
        else if (addr.suburb || item.type === 'suburb') type = 'dzielnica';

        const detailParts: string[] = [];
        if (gmina && gmina.toLowerCase() !== rawName.toLowerCase()) detailParts.push(`gm. ${gmina}`);
        if (county) detailParts.push(county);
        if (voivodeship) detailParts.push(`woj. ${voivodeship}`);

        return {
          name: rawName,
          type,
          details: detailParts.join(', '),
          voivodeship: voivodeship || 'Polska',
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          displayName: item.display_name,
        };
      });

      geocodeCache.set(cacheKey, results);
      return res.json({ success: true, results });
    } catch (err: any) {
      console.warn('Geocoding error:', err?.message || err);
      return res.status(500).json({ success: false, error: 'Błąd wyszukiwania miejscowości.' });
    }
  });

  // API Route: Reverse Geocode exact GPS coordinates to village/town and voivodeship
  app.get('/api/reverse-geocode', async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ success: false, error: 'Nieprawidłowe współrzędne GPS.' });
      }

      const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      if (reverseGeocodeCache.has(cacheKey)) {
        return res.json({ success: true, location: reverseGeocodeCache.get(cacheKey) });
      }

      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PetCare-Veterinary-App/2.0 (contact: baluch.arek@gmail.com)',
          'Accept-Language': 'pl,en',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        return res.status(502).json({ success: false, error: 'Błąd geolokalizacji' });
      }

      const data = await response.json();
      const addr = data.address || {};
      const rawName = addr.village || addr.town || addr.city || addr.hamlet || addr.suburb || addr.municipality || 'Twoja lokalizacja';
      const gmina = (addr.municipality || '').replace(/^gmina\s+/i, '');
      const county = addr.county || '';
      const voivodeship = (addr.state || '').replace(/^województwo\s+/i, '');

      let type = 'miejscowość';
      if (addr.village) type = 'wieś';
      else if (addr.town || addr.city) type = 'miasto';
      else if (addr.suburb) type = 'dzielnica';

      const detailParts: string[] = [];
      if (gmina && gmina.toLowerCase() !== rawName.toLowerCase()) detailParts.push(`gm. ${gmina}`);
      if (county) detailParts.push(county);
      if (voivodeship) detailParts.push(`woj. ${voivodeship}`);

      const locationResult = {
        name: rawName,
        type,
        details: detailParts.join(', '),
        voivodeship: voivodeship || '',
        road: addr.road || '',
        lat,
        lng,
        fullLabel: `${rawName}${detailParts.length > 0 ? ` (${detailParts.join(', ')})` : ''}`,
      };

      reverseGeocodeCache.set(cacheKey, locationResult);
      return res.json({ success: true, location: locationResult });
    } catch (err: any) {
      console.warn('Reverse geocoding error:', err?.message || err);
      return res.status(500).json({ success: false, error: 'Błąd pobierania nazwy miejscowości.' });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'PetCare API' });
  });

  // Direct APK download route
  app.get(['/PetCare.apk', '/download-apk', '/api/download-apk'], (req, res) => {
    const apkPath = path.resolve(__dirname, 'public', 'PetCare.apk');
    if (fs.existsSync(apkPath)) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="PetCare.apk"');
      return res.sendFile(apkPath);
    }
    return res.status(404).json({ error: 'Plik APK nie został znaleziony.' });
  });

  // Vite middleware in dev or static files in production
  if (!serveFrontend) {
    // API-only mode (tests)
  } else if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  return app;
}

if (!process.env.VITEST) {
  createApp()
    .then((app) => {
      const PORT = Number(process.env.PORT) || 3000;
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`PetCare server running on http://0.0.0.0:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}
