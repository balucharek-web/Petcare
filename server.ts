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
