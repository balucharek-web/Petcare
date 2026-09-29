import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

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
