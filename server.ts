import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
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
    name: string;
    avatar?: string;
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

  // API Route: Cloud Sync Auth (Login or Register)
  app.post('/api/cloud-sync/auth', (req, res) => {
    try {
      const { email, password, name, avatar } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ success: false, error: 'Wymagany jest adres e-mail konta Google lub PetCare.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const db = readSyncDB();
      let user = db.users[normalizedEmail];

      if (!user) {
        // Register new cloud account
        const generatedToken = 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        user = {
          email: normalizedEmail,
          passwordHash: password || 'default_pass',
          name: name || normalizedEmail.split('@')[0],
          avatar: avatar || '',
          lastSyncTime: null,
          petCount: 0,
          token: generatedToken,
        };
        db.users[normalizedEmail] = user;
        writeSyncDB(db);
      } else {
        // Check password if provided and user has a password set
        if (password && user.passwordHash && user.passwordHash !== password) {
          return res.status(401).json({ 
            success: false, 
            error: 'Nieprawidłowe hasło/PIN dla tego konta. Użyj hasła ustawionego podczas pierwszej synchronizacji.' 
          });
        }
        if (name && !user.name) user.name = name;
        if (avatar && !user.avatar) user.avatar = avatar;
        writeSyncDB(db);
      }

      return res.json({
        success: true,
        token: user.token,
        user: {
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
        petCount: user.petCount,
        lastSyncTime: user.lastSyncTime,
        hasData: !!user.payload,
      });
    } catch (err: any) {
      console.error('Cloud Sync Auth error:', err);
      return res.status(500).json({ success: false, error: 'Błąd serwera logowania.' });
    }
  });

  // API Route: Upload PetCare data to Cloud
  app.post('/api/cloud-sync/upload', (req, res) => {
    try {
      const { email, token, payload, petCount } = req.body;
      if (!email || !payload) {
        return res.status(400).json({ success: false, error: 'Brak danych do synchronizacji.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const db = readSyncDB();
      const user = db.users[normalizedEmail];

      if (!user || (token && user.token !== token)) {
        return res.status(403).json({ success: false, error: 'Nieautoryzowana sesja. Zaloguj się ponownie.' });
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

  // API Route: Download PetCare data from Cloud
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
        return res.status(404).json({ success: false, error: 'Nie znaleziono danych w chmurze dla tego konta.' });
      }

      if (token && user.token !== token) {
        return res.status(403).json({ success: false, error: 'Sesja wygasła. Zaloguj się ponownie.' });
      }

      if (!user.payload) {
        return res.status(404).json({ success: false, error: 'Konto istnieje, ale nie zapisano jeszcze na nim żadnej kopii zwierzaków.' });
      }

      return res.json({
        success: true,
        payload: user.payload,
        lastSyncTime: user.lastSyncTime,
        petCount: user.petCount,
      });
    } catch (err: any) {
      console.error('Cloud Sync Download error:', err);
      return res.status(500).json({ success: false, error: 'Błąd pobierania danych z chmury.' });
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
    try {
      const { imageBase64, mimeType, petSpecies, petName } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: 'Brak danych zdjęcia' });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        // Fallback demo data if API key is not yet set in user environment
        return res.json({
          success: true,
          isMock: true,
          extracted: {
            type: 'medication',
            title: 'Zalecenia weterynaryjne (Wzorzec)',
            summary: `Automatycznie wykryto receptę i leki dla: ${petName || 'zwierzaka'}. Skonfiguruj klucz GEMINI_API_KEY, aby włączyć analizę na żywo.`,
            medications: [
              {
                name: 'Synulox (Amoksycylina)',
                dosage: '1/2 tabletki 2x dziennie',
                instructions: 'Podawać z mokrą karmą rano i wieczorem przez 7 dni',
                form: 'tablet',
                isChronic: false,
              },
              {
                name: 'Flora Defense (Probiotyk)',
                dosage: '1 kapsułka 1x dziennie',
                instructions: 'Zawartość kapsułki wysypać na karmę',
                form: 'capsule',
                isChronic: false,
              }
            ],
            examParameters: [
              { name: 'Leukocyty (WBC)', value: '11.2', unit: 'G/l', refRange: '6.0 - 17.0', status: 'normal' },
              { name: 'Erytrocyty (RBC)', value: '7.1', unit: 'T/l', refRange: '5.5 - 8.5', status: 'normal' },
              { name: 'Kreatynina', value: '1.2', unit: 'mg/dl', refRange: '0.6 - 1.6', status: 'normal' },
              { name: 'Mocznik', value: '42', unit: 'mg/dl', refRange: '20 - 50', status: 'normal' },
              { name: 'ALT (GPT)', value: '68', unit: 'U/l', refRange: '10 - 80', status: 'normal' }
            ],
            doctorNotes: 'Kontrola po ukończeniu kuracji antybiotykowej za 7 dni.'
          }
        });
      }

      const ai = new GoogleGenAI();
      const prompt = `Jesteś ekspertem weterynaryjnym i asystentem klinicznym.
Przeanalizuj to zdjęcie (może to być recepta, karta informacyjna wizyty weterynaryjnej, etykieta/pudełko leku lub wyniki badania laboratoryjnego/krwi) dla pacjenta: ${petName || 'zwierzak'} (gatunek: ${petSpecies || 'pies/kot'}).

Wyodrębnij wszystkie kluczowe informacje medyczne i zwróć WYŁĄCZNIE poprawny, czysty obiekt JSON (bez markdown, bez \`\`\`json):
{
  "type": "medication" | "exam_blood" | "visit_recommendation",
  "title": "Tytuł dokumentu lub nazwa leku",
  "summary": "Krótkie podsumowanie zaleceń lub wyników",
  "medications": [
    {
      "name": "Nazwa leku i substancja czynna",
      "dosage": "Dawkowanie (np. 1 tabletka 2x dziennie)",
      "instructions": "Zalecenia (np. z karmą, na czczo, przez ile dni)",
      "form": "tablet" | "capsule" | "liquid" | "drops" | "ointment" | "injection" | "other",
      "isChronic": false
    }
  ],
  "examParameters": [
    {
      "name": "Nazwa parametru (np. Leukocyty, Kreatynina, ALT)",
      "value": "Wynik liczbowy",
      "unit": "Jednostka (np. mg/dl, G/l)",
      "refRange": "Zakres referencyjny",
      "status": "normal" | "attention" | "abnormal"
    }
  ],
  "doctorNotes": "Uwagi lekarza lub zalecenia kontrolne"
}`;

      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: mimeType || 'image/jpeg',
                },
              },
              { text: prompt },
            ],
          },
        ],
      });

      const responseText = response.text || '';
      const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return res.json({
        success: true,
        extracted: parsed,
      });
    } catch (err: any) {
      console.error('Błąd skanowania medycznego Gemini:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Błąd podczas przetwarzania obrazu',
      });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'PetCare API' });
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
