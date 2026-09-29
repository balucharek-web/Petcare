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
      const generatedToken = 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);

      if (!user) {
        // Register new cloud account
        user = {
          email: normalizedEmail,
          passwordHash: password || 'default_pass',
          name: name || normalizedEmail.split('@')[0],
          avatar: avatar || '',
          lastSyncTime: null,
          petCount: 0,
          token: generatedToken,
        };

        // If another account on disk has pets from earlier versions, adopt them so user does not lose data!
        for (const otherEmail in db.users) {
          const other = db.users[otherEmail];
          if (other.payload && Array.isArray(other.payload.pets) && other.payload.pets.length > 0) {
            user.payload = JSON.parse(JSON.stringify(other.payload));
            user.petCount = other.petCount || user.payload.pets.length;
            user.lastSyncTime = other.lastSyncTime || new Date().toISOString();
            break;
          }
        }

        db.users[normalizedEmail] = user;
        writeSyncDB(db);
      } else {
        // Refresh token on login
        user.token = generatedToken;
        if (password && user.passwordHash && user.passwordHash !== password) {
          return res.status(401).json({ 
            success: false, 
            error: 'Nieprawidłowe hasło/PIN dla tego konta.' 
          });
        }
        if (name && !user.name) user.name = name;
        if (avatar && !user.avatar) user.avatar = avatar;

        // If current user record has no pets, check if any disk record has pets from earlier versions
        if (!user.payload || !Array.isArray(user.payload.pets) || user.payload.pets.length === 0) {
          for (const otherEmail in db.users) {
            const other = db.users[otherEmail];
            if (otherEmail !== normalizedEmail && other.payload && Array.isArray(other.payload.pets) && other.payload.pets.length > 0) {
              user.payload = JSON.parse(JSON.stringify(other.payload));
              user.petCount = other.petCount || user.payload.pets.length;
              user.lastSyncTime = other.lastSyncTime || new Date().toISOString();
              break;
            }
          }
        }
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
        hasData: !!(user.payload && Array.isArray(user.payload.pets) && user.payload.pets.length > 0),
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
      let user = db.users[normalizedEmail];

      if (!user) {
        user = {
          email: normalizedEmail,
          name: normalizedEmail.split('@')[0],
          token: token || 'tok_' + Math.random().toString(36).substring(2),
          lastSyncTime: null,
          petCount: 0,
        };
        db.users[normalizedEmail] = user;
      } else if (token) {
        user.token = token;
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
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Brak adresu e-mail.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const db = readSyncDB();
      let user = db.users[normalizedEmail];

      let payloadToReturn = user?.payload;
      let lastSyncTime = user?.lastSyncTime;
      let petCount = user?.petCount;

      // If this user has no pets, search other records on disk (from earlier versions)
      if (!payloadToReturn || !Array.isArray(payloadToReturn.pets) || payloadToReturn.pets.length === 0) {
        for (const otherEmail in db.users) {
          const other = db.users[otherEmail];
          if (other.payload && Array.isArray(other.payload.pets) && other.payload.pets.length > 0) {
            payloadToReturn = JSON.parse(JSON.stringify(other.payload));
            lastSyncTime = other.lastSyncTime;
            petCount = other.petCount || payloadToReturn.pets.length;
            if (user) {
              user.payload = payloadToReturn;
              user.petCount = petCount;
              user.lastSyncTime = lastSyncTime;
              writeSyncDB(db);
            }
            break;
          }
        }
      }

      if (!payloadToReturn) {
        return res.status(404).json({ success: false, error: 'Nie znaleziono zapisanych zwierzaków w chmurze.' });
      }

      return res.json({
        success: true,
        payload: payloadToReturn,
        lastSyncTime: lastSyncTime || new Date().toISOString(),
        petCount: petCount || payloadToReturn.pets?.length || 0,
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
    const { imageBase64, mimeType, petSpecies, petName } = req.body || {};

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

      const prompt = `Jesteś rzetelnym weterynaryjnym systemem analizy dokumentów medycznych i leków.
Twoim NAJWAŻNIEJSZYM zadaniem jest bezwzględna prawdomówność i weryfikacja czy przesłane zdjęcie to w ogóle dokument medyczny lub lek.

KROK 1 - KRYTYCZNA WERYFIKACJA ZDJĘCIA:
Oceń czy zdjęcie przedstawia:
- Receptę weterynaryjną lub lekarską,
- Pudełko, buteleczkę, blister lub etykietę LEKU weterynaryjnego lub ludzkiego podawanego zwierzęciu,
- Wypis z lecznicy / kartę informacyjną wizyty weterynaryjnej,
- Wyniki badań laboratoryjnych (np. badanie krwi, moczu, USG, RTG).

JEŻELI ZDJĘCIE TO:
- Ulotka reklamowa (np. gazetka sklepowa, ulotka pizzerii, reklama usług, ulotka kredytowa),
- Dowolna grafika, plakat, rysunek, mem, krajobraz, zdjęcie człowieka lub pokoju,
- Paragon ze sklepu spożywczego lub odzieżowego,
- Przedmiot niemedyczny (zabawka, karma bez leku, ubranie, mebel, ekran itp.):

WÓWCZAS MUSISZ BEZWZGLĘDNIE ZWRÓCIĆ:
{
  "isValidMedicalDocument": false,
  "type": "invalid",
  "title": "Dokument niemedyczny",
  "summary": "Przesłane zdjęcie nie przedstawia recepty weterynaryjnej, opakowania leku ani karty informacyjnej z lecznicy. Nie wykryto żadnych leków ani zaleceń weterynaryjnych.",
  "medications": [],
  "examParameters": [],
  "doctorNotes": ""
}

KROK 2 - JEŚLI TO PRAWDZIWY DOKUMENT MEDYCZNY LUB LEK:
Wyodrębnij TYLKO te leki, które są RZECZYWIŚCIE WIDOCZNE na zdjęciu. NIE WYMYŚLAJ żadnych preparatów, których nie ma na zdjęciu!
Pacjent: ${petName || 'zwierzak'} (${petSpecies || 'pies/kot'}).

Zwróć WYŁĄCZNIE czysty obiekt JSON w schemacie:
{
  "isValidMedicalDocument": boolean,
  "type": "medication" | "exam_blood" | "visit_recommendation" | "invalid",
  "title": string,
  "summary": string,
  "medications": [
    {
      "name": string,
      "dosage": string,
      "instructions": string,
      "form": "tablet" | "capsule" | "liquid" | "drops" | "ointment" | "injection" | "other",
      "isChronic": boolean
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

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
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
