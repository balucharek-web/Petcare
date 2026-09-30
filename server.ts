import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  // Enable CORS for web, mobile apps (Capacitor), and local environments
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Persistent Cloud Sync Storage
  const DATA_FILE = path.resolve(__dirname, 'data', 'cloud_sync_db.json');

  interface UserSyncRecord {
    email: string;
    passwordHash?: string;
    salt?: string;
    name: string;
    avatar?: string;
    provider?: 'google' | 'email';
    lastSyncTime: string | null;
    petCount: number;
    payload?: any;
    token: string;
    pairCode?: {
      code: string;
      expiresAt: number;
    };
  }

  interface SyncDB {
    users: Record<string, UserSyncRecord>;
  }

  function readSyncDB(): SyncDB {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error reading cloud_sync_db.json:', err);
    }
    return { users: {} };
  }

  function writeSyncDB(db: SyncDB) {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing cloud_sync_db.json:', err);
    }
  }

  // Password helper
  function hashPassword(password: string, salt: string): string {
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
  }

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
      const firebaseApiKey = process.env.FIREBASE_API_KEY || 'AIzaSyA_M_UwFyqQWHBCb5zqqfUeq8KXmLQFsow';
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
        if (gData.email && (gData.email_verified === 'true' || gData.email_verified === true)) {
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
        audience: [
          '764412082432-q5d25pi0er4lnevgagscd26h7mkm8kcb.apps.googleusercontent.com',
        ],
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

  // API Route: Cloud Sync Auth (Login, Register, Google)
  app.post('/api/cloud-sync/auth', async (req, res) => {
    try {
      const { email, password, name, avatar, provider, action, idToken } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ success: false, error: 'Wymagany jest poprawny adres e-mail.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail.includes('@') || normalizedEmail.length < 5) {
        return res.status(400).json({ success: false, error: 'Podany adres e-mail jest nieprawidłowy.' });
      }

      const db = readSyncDB();
      let user = db.users[normalizedEmail];
      const generatedToken = 'tok_' + crypto.randomBytes(24).toString('hex');

      // 1. Google Provider Sign-in (Secure OIDC Verification)
      if (provider === 'google' || action === 'google') {
        if (!idToken || typeof idToken !== 'string') {
          return res.status(401).json({
            success: false,
            error: 'Brak bezpiecznego tokenu tożsamości Google (idToken). Autoryzacja odrzucona ze względów bezpieczeństwa.',
          });
        }

        const verifiedUser = await verifyGoogleOrFirebaseToken(idToken);
        if (!verifiedUser || !verifiedUser.email) {
          return res.status(401).json({
            success: false,
            error: 'Nieprawidłowy lub wygasły token konta Google. Odmowa dostępu.',
          });
        }

        // Must match the verified identity from Google
        if (normalizedEmail !== verifiedUser.email) {
          return res.status(403).json({
            success: false,
            error: 'Wykryto niezgodność adresu e-mail z podpisanym tokenem Google.',
          });
        }

        const effectiveName = name || verifiedUser.name || normalizedEmail.split('@')[0];
        const effectiveAvatar = avatar || verifiedUser.avatar || '';

        if (!user) {
          user = {
            email: normalizedEmail,
            name: effectiveName,
            avatar: effectiveAvatar,
            provider: 'google',
            token: generatedToken,
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
          db.users[normalizedEmail] = user;
        } else {
          user.token = generatedToken;
          if (effectiveName) user.name = effectiveName;
          if (effectiveAvatar) user.avatar = effectiveAvatar;
          user.provider = 'google';
        }
        writeSyncDB(db);

        return res.json({
          success: true,
          token: user.token,
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

        const salt = crypto.randomBytes(16).toString('hex');
        const passwordHash = hashPassword(password, salt);

        user = {
          email: normalizedEmail,
          passwordHash,
          salt,
          name: name || normalizedEmail.split('@')[0],
          avatar: avatar || '',
          provider: 'email',
          token: generatedToken,
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
        db.users[normalizedEmail] = user;
        writeSyncDB(db);

        return res.json({
          success: true,
          token: user.token,
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

      // Verify password
      let isValidPassword = false;
      if (user.salt && user.passwordHash) {
        const testHash = hashPassword(password, user.salt);
        isValidPassword = (testHash === user.passwordHash);
      } else if (user.passwordHash) {
        isValidPassword = (user.passwordHash === password || user.passwordHash === 'default_pass');
      }

      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false, 
          error: 'Nieprawidłowe hasło dla tego konta.' 
        });
      }

      user.token = generatedToken;
      writeSyncDB(db);

      return res.json({
        success: true,
        token: user.token,
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
  app.post('/api/cloud-sync/upload', (req, res) => {
    try {
      const { email, token, payload, petCount } = req.body;
      if (!email || !payload) {
        return res.status(400).json({ success: false, error: 'Brak danych do synchronizacji.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const db = readSyncDB();
      const user = db.users[normalizedEmail];

      if (!token || typeof token !== 'string' || !user || !user.token || user.token !== token) {
        return res.status(401).json({ 
          success: false, 
          error: 'Brak autoryzacji sesji. Zaloguj się ponownie.' 
        });
      }

      const now = new Date().toISOString();
      user.payload = payload;
      user.petCount = typeof petCount === 'number' ? petCount : (payload.pets?.length || 0);
      user.lastSyncTime = now;
      writeSyncDB(db);

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
  app.post('/api/cloud-sync/download', (req, res) => {
    try {
      const { email, token } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Brak adresu e-mail.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const db = readSyncDB();
      const user = db.users[normalizedEmail];

      if (!user) {
        return res.status(404).json({ success: false, error: 'Nie znaleziono konta w chmurze.' });
      }

      // Strict security: Require matching active session token
      if (!token || typeof token !== 'string' || !user.token || user.token !== token) {
        return res.status(401).json({ 
          success: false, 
          error: 'Brak autoryzacji sesji. Wymagany jest ważny token sesji.' 
        });
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

  // In-memory / persistent QR Sync Transfers
  interface QRTransferRecord {
    id: string;
    payload: any;
    petCount: number;
    email?: string;
    expiresAt: number;
    createdAt: string;
  }
  const qrTransfers = new Map<string, QRTransferRecord>();

  // API Route: Generate a QR Code Transfer with all pet data and attachments
  app.post('/api/cloud-sync/generate-qr', (req, res) => {
    try {
      const { payload, email } = req.body;
      if (!payload) {
        return res.status(400).json({ success: false, error: 'Brak danych do synchronizacji QR.' });
      }

      const qrId = 'pc_sync_' + crypto.randomBytes(9).toString('hex');
      const petCount = Array.isArray(payload.pets) ? payload.pets.length : 0;
      const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes

      qrTransfers.set(qrId, {
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
  app.post('/api/cloud-sync/redeem-qr', (req, res) => {
    try {
      const { qrId, code } = req.body;
      const targetId = qrId || code;

      if (!targetId) {
        return res.status(400).json({ success: false, error: 'Brak identyfikatora kodu QR.' });
      }

      // Try QR Transfers map first
      const record = qrTransfers.get(targetId);
      if (record) {
        if (Date.now() > record.expiresAt) {
          qrTransfers.delete(targetId);
          return res.status(410).json({ success: false, error: 'Ten kod QR wygasł (ważny przez 30 minut). Wygeneruj nowy na pierwszym telefonie.' });
        }

        return res.json({
          success: true,
          payload: record.payload,
          petCount: record.petCount,
          lastSyncTime: record.createdAt,
        });
      }

      // Fallback: check 6-digit pairCode in syncDB
      const db = readSyncDB();
      for (const email in db.users) {
        const u = db.users[email];
        if (u.pairCode && (u.pairCode.code === targetId || u.token === targetId)) {
          if (Date.now() > u.pairCode.expiresAt) {
            return res.status(410).json({ success: false, error: 'Kod wygasł. Wygeneruj nowy na pierwszym urządzeniu.' });
          }
          return res.json({
            success: true,
            payload: u.payload,
            petCount: u.petCount,
            lastSyncTime: u.lastSyncTime || new Date().toISOString(),
          });
        }
      }

      return res.status(404).json({ success: false, error: 'Nie znaleziono danych dla tego kodu QR lub kod wygasł.' });
    } catch (err: any) {
      console.error('Error in /api/cloud-sync/redeem-qr:', err);
      return res.status(500).json({ success: false, error: 'Błąd pobierania danych przez kod QR.' });
    }
  });

  // API Route: Generate a 6-digit Quick Pair PIN
  app.post('/api/cloud-sync/generate-code', (req, res) => {
    try {
      const { email, token } = req.body;
      const normalizedEmail = (email || '').trim().toLowerCase();
      const db = readSyncDB();
      const user = db.users[normalizedEmail];

      if (!user || user.token !== token) {
        return res.status(403).json({ success: false, error: 'Wymagane logowanie do wygenerowania kodu.' });
      }

      // Generate 6-digit random code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      user.pairCode = {
        code,
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins
      };
      writeSyncDB(db);

      return res.json({ success: true, code, expiresAt: user.pairCode.expiresAt });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Błąd generowania kodu.' });
    }
  });

  // API Route: Pair and Restore using 6-digit PIN on any phone
  app.post('/api/cloud-sync/pair-code', (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ success: false, error: 'Podaj 6-cyfrowy kod parowania.' });
      }

      const cleanCode = code.replace(/\D/g, '');
      const db = readSyncDB();

      let matchedUser: UserSyncRecord | null = null;
      for (const email in db.users) {
        const u = db.users[email];
        if (u.pairCode && u.pairCode.code === cleanCode) {
          if (Date.now() > u.pairCode.expiresAt) {
            return res.status(410).json({ success: false, error: 'Ten kod parowania wygasł (ważny przez 15 minut). Wygeneruj nowy na pierwszym telefonie.' });
          }
          matchedUser = u;
          break;
        }
      }

      if (!matchedUser) {
        return res.status(404).json({ success: false, error: 'Nieprawidłowy kod parowania lub kod już wygasł.' });
      }

      return res.json({
        success: true,
        user: {
          email: matchedUser.email,
          name: matchedUser.name,
          avatar: matchedUser.avatar,
        },
        token: matchedUser.token,
        payload: matchedUser.payload,
        petCount: matchedUser.petCount,
        lastSyncTime: matchedUser.lastSyncTime,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Błąd parowania urządzeń.' });
    }
  });

  // API Route: AI Medical & Prescription Scanner
  app.post('/api/scan-medical', async (req, res) => {
    const { imageBase64, mimeType, petSpecies, petName, petWeightKg, deepDecipherMode } = req.body || {};

    try {
      if (!imageBase64) {
        return res.status(400).json({ success: false, error: 'Brak danych zdjęcia' });
      }

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

      const prompt = `Jesteś najwyższej klasy weterynaryjnym ekspertem OCR, transkrypcji i analizy dokumentów medycznych, recept, kart wypisowych oraz opakowań leków.
Twoim głównym zadaniem jest PRECYZYJNE ROZPOZNANIE I ODCZYTANIE NAWET BARDZO TRUDNYCH MATERIAŁÓW:
1. PISMA RĘCZNEGO LEKARZY WETERYNARII:
   - Szybkie, pochyłe bazgroły, zniekształcone litery, połączone znaki kursywy,
   - Odręczne zalecenia na kartce, recepty lekarskie, odręczne wpisy w książeczce zdrowia.
2. BLADEGO, ZNISZCZONEGO LUB NIEDODRUKOWANEGO TEKSTU:
   - Wydruki na papierze termicznym z lecznicy (wyblakły fioletowy/szary tusz, zatarte fragmenty),
   - Drukarki igłowe z brakującymi igłami/punktami,
   - Słaby toner, zagięty lub zmięty papier, cienie od dłoni, żółte sztuczne światło, lekki obrót lub pochylenie kadru.

KONTEKST PACJENTA:
- Imię: ${petName || 'pacjent'}
- Gatunek: ${petSpecies || 'pies/kot'}
- Waga: ${petWeightKg ? `${petWeightKg} kg` : 'nieznana'}
${deepDecipherMode ? '- TRYB GŁĘBOKIEGO ROZSZYFROWYWANIA: Włączony. Przeprowadź drobiazgową analizę każdego pociągnięcia długopisu/tuszu.' : ''}

ZASADY TRANSLACJI I ROZPOZNAWANIA WETERYNARYJNEGO:
- Wykorzystaj wiedzę o skrótach medycznych:
  * "Rp." (Recipe - weź/przepisano)
  * "D.S." lub "S." (Da Signa - oznacz dawkowanie)
  * "tabl.", "tab.", "kaps.", "inj.", "s.c.", "p.o.", "i.m.", "zawiesina", "krople", "maść", "syrop"
  * "1x1", "2x1", "1x dz.", "2x dz.", "co 12h", "co 24h", "co 8h", "1/2 tab.", "1/4 tab.", "0.5 tabl."
  * "rano i wieczorem", "z posiłkiem", "na czczo", "przez X dni".
- Wykorzystaj znajomość leków weterynaryjnych:
  * Przeciwbólowe/NLPZ: Onsior, Metacam (Meloksykam), Cimalgex, Previcox, Rimadyl, Trocoxil, Cortavet
  * Antybiotyki: Synulox, Kesium, Clavaseptin, Amotaks, Marbocyl, Enrobioflox, Baytril, Synergal
  * Dermatologia/Alergie: Apoquel (5.4mg, 16mg), Cytopoint, Atopica, Cortavance, Dexafort
  * Kardiologia i Nerki: Vetmedin, Cardalis, Cardisure, Benakor, Fortekor, Semintra, Pronefra, RenalVet
  * Przeciwpasożytnicze: Bravecto, NexGard, Simparica, Credelio, Milpro, Milprazon, Drontal, Dehinel, NexGard Spectra
  * Gastrologia: Cerenia, Flora Defense, Hepato Force, Zentonil, Venter, Ranigast
  * Sterydy i inne: Encorton, Prednicortone, Gabapentyna, Pexion.
  Dopasuj nawet częściowo nieczytelne słowa (np. "Sy...ux 250" -> "Synulox 250 mg", "Apoq... 5.4" -> "Apoquel 5.4 mg").

- Wygeneruj sugerowane konkretne godziny podania (np. 2x dziennie -> ["08:00", "20:00"]; 1x rano -> ["08:00"]).

Zwróć WYŁĄCZNIE poprawny format JSON w schemacie:
{
  "isValidMedicalDocument": boolean,
  "type": "medication" | "exam_blood" | "visit_recommendation" | "invalid",
  "title": string,
  "summary": string,
  "confidence": "high" | "medium" | "estimated",
  "detectedRawText": string,
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

      // Ensure fields exist
      if (typeof parsed.isValidMedicalDocument !== 'boolean') {
        parsed.isValidMedicalDocument = Array.isArray(parsed.medications) && parsed.medications.length > 0;
      }
      if (!Array.isArray(parsed.medications)) {
        parsed.medications = [];
      }
      if (!Array.isArray(parsed.examParameters)) {
        parsed.examParameters = [];
      }

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
  if (process.env.NODE_ENV !== 'production') {
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PetCare server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
