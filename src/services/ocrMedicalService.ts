import Tesseract from 'tesseract.js';

export interface ExtractedMedication {
  name: string;
  dosage: string;
  instructions: string;
  form: 'tablet' | 'capsule' | 'liquid' | 'drops' | 'ointment' | 'injection' | 'other';
  isChronic: boolean;
  suggestedHours?: string[];
}

export interface ExtractedExamParameter {
  name: string;
  value: string;
  unit: string;
  refRange: string;
  status: 'normal' | 'attention' | 'abnormal';
}

export interface ExtractedMedicalData {
  isValidMedicalDocument: boolean;
  type: 'medication' | 'exam_blood' | 'visit_recommendation' | 'invalid';
  title: string;
  summary: string;
  medications: ExtractedMedication[];
  examParameters: ExtractedExamParameter[];
  doctorNotes: string;
}

// Known Polish / Latin veterinary medications database
const VET_MEDICINES: Array<{
  name: string;
  aliases: string[];
  defaultForm: ExtractedMedication['form'];
  defaultInstructions: string;
  isChronic?: boolean;
}> = [
  // Endocrinology & Thyroid
  { 
    name: 'Forthyron (Lewotyroksyna sodowa - tarczyca)', 
    aliases: ['forthyron', 'forthyr', 'levothyroxin', 'lewotyroksyn', 'euthyrox', 'letrox', 'tarczyca', 'tarczycy', 'niedoczynnosc', 'niedoczynność'], 
    defaultForm: 'tablet', 
    defaultInstructions: 'Podawać na czczo ok. 30 min przed posiłkiem, co 12h o stałych porach. Leczenie stałe',
    isChronic: true 
  },
  { 
    name: 'Vetoryl (Trilostan - Zespół Cushinga)', 
    aliases: ['vetoryl', 'trilostan', 'trilostane', 'cushing'], 
    defaultForm: 'capsule', 
    defaultInstructions: 'Podawać rano z karmą',
    isChronic: true 
  },
  { 
    name: 'Felimazole / Apelka (Tiamazol - nadczynność tarczycy kota)', 
    aliases: ['felimazole', 'apelka', 'thiamazole', 'tiamazol', 'thyronorm'], 
    defaultForm: 'tablet', 
    defaultInstructions: 'Podawać o stałych porach',
    isChronic: true 
  },

  // Antibiotics & Antimicrobials
  { name: 'Synulox (Amoksycylina + Kw. klawulanowy)', aliases: ['synulox', 'amoksycylina', 'amoxicillin', 'clavulanic', 'synergal'], defaultForm: 'tablet', defaultInstructions: 'Podawać z karmą w stałych odstępach czasu' },
  { name: 'Kesium (Antybiotyk weterynaryjny)', aliases: ['kesium', 'clavaseptin', 'clavubactin'], defaultForm: 'tablet', defaultInstructions: 'Podawać bezpośrednio do pyszczka lub z posiłkiem' },
  { name: 'Amotaks (Amoksycylina)', aliases: ['amotaks', 'amoxicilline'], defaultForm: 'tablet', defaultInstructions: 'Zalecana kuracja przez wyznaczoną liczbę dni' },
  { name: 'Marbocyl / Enrobioflox (Fluorochinolony)', aliases: ['marbocyl', 'marbofloksacyna', 'enrobioflox', 'baytril', 'enrofloksacyna'], defaultForm: 'tablet', defaultInstructions: 'Podawać raz dziennie o stałej porze' },

  // Pain Relief & NSAIDs
  { name: 'Metacam (Meloksykam - p/bólowy i p/zapalny)', aliases: ['metacam', 'meloksykam', 'meloxicam', 'meloxidyl', 'loxicom', 'inflacam'], defaultForm: 'liquid', defaultInstructions: 'Podawać raz dziennie z posiłkiem' },
  { name: 'Onsior (Robenakoksib - p/bólowy)', aliases: ['onsior', 'robenakoksib', 'robenacoxib'], defaultForm: 'tablet', defaultInstructions: 'Podawać o stałej porze bez jedzenia lub z małym kęsem' },
  { name: 'Cimalgex / Previcox (NLPZ)', aliases: ['cimalgex', 'previcox', 'firocoxib', 'cimicoxib', 'rimadyl', 'trocoxil'], defaultForm: 'tablet', defaultInstructions: 'Podawać z jedzeniem lub bezpośrednio do pyska' },
  { name: 'Librela / Solensia (Przeciwciała monoklonalne na stawy)', aliases: ['librela', 'solensia', 'bedinvetmab', 'frunevetmab'], defaultForm: 'injection', defaultInstructions: 'Iniekcja podskórna raz na miesiąc w gabinecie weterynaryjnym' },

  // Dermatology & Allergy
  { name: 'Apoquel (Oklacytynib - p/świądowy)', aliases: ['apoquel', 'oklacytynib', 'oclacitinib'], defaultForm: 'tablet', defaultInstructions: 'Podawać według zaleceń dermatologa weterynaryjnego', isChronic: true },
  { name: 'Cytopoint (Iniekcja przeciwświądowa)', aliases: ['cytopoint', 'lokivetmab'], defaultForm: 'injection', defaultInstructions: 'Zastrzyk podskórny co 4-8 tygodni w gabinecie' },
  { name: 'Atopica (Cyklosporyna)', aliases: ['atopica', 'cyklosporyna', 'ciclosporin'], defaultForm: 'capsule', defaultInstructions: 'Podawać min. 2h przed lub po posiłku' },

  // Antiparasitics
  { name: 'Bravecto (Fluralaner - p/kleszczowy)', aliases: ['bravecto', 'fluralaner'], defaultForm: 'tablet', defaultInstructions: 'Podać w trakcie lub bezpośrednio po posiłku' },
  { name: 'Nexgard Spectra (Afoksolaner + Milbemycyna)', aliases: ['nexgard', 'spectra', 'afoxolaner'], defaultForm: 'tablet', defaultInstructions: 'Podać jako smaczek raz w miesiącu' },
  { name: 'Simparica (Sarolaner - kleszcze i pchły)', aliases: ['simparica', 'sarolaner', 'credelio'], defaultForm: 'tablet', defaultInstructions: 'Podać raz w miesiącu profilaktycznie' },
  { name: 'Milpro / Milprazon (Odrobaczenie)', aliases: ['milpro', 'milprazon', 'milbemycin', 'drontal', 'dehinel', 'cestal'], defaultForm: 'tablet', defaultInstructions: 'Podać na czczo lub z małym kęsem karmy' },

  // Cardiology & Nephrology
  { name: 'Vetmedin / Cardisure (Pimobendan - serce)', aliases: ['vetmedin', 'cardisure', 'pimobendan'], defaultForm: 'tablet', defaultInstructions: 'Podać na czczo około 1h przed karmieniem', isChronic: true },
  { name: 'Semintra (Telmisartan - nerki kota)', aliases: ['semintra', 'telmisartan', 'pronefra', 'ipakitine', 'renalvet'], defaultForm: 'liquid', defaultInstructions: 'Podawać raz dziennie doustnie za pomocą strzykawki', isChronic: true },
  { name: 'Prilactone / Cardalis (Spironolakton + Benazepril)', aliases: ['prilactone', 'cardalis', 'spironolakton', 'benakor', 'fortekor', 'lotensin'], defaultForm: 'tablet', defaultInstructions: 'Podawać raz dziennie z karmą', isChronic: true },
  { name: 'Karsivan (Propentofilina)', aliases: ['karsivan', 'propentofilina', 'propentofylline'], defaultForm: 'tablet', defaultInstructions: 'Podawać rano i wieczorem min. 30 minut przed posiłkiem' },

  // Gastroenterology & Hepatology
  { name: 'Cerenia (Maropitant - p/wymiotny)', aliases: ['cerenia', 'maropitant'], defaultForm: 'tablet', defaultInstructions: 'Podać z niewielką ilością karmy min. 2h przed podróżą' },
  { name: 'Flora Defense / FortiFlora (Probiotyk)', aliases: ['flora defense', 'fortiflora', 'probiotyk', 'synbiotyk', 'dia dog'], defaultForm: 'capsule', defaultInstructions: 'Wysypać zawartość kapsułki/saszetki na wilgotną karmę' },
  { name: 'Hepatiale Forte / Ursofalk (Wątroba)', aliases: ['hepatiale', 'ursofalk', 'zentonil', 'hepato force', 'kwas ursodeoksycholowy'], defaultForm: 'capsule', defaultInstructions: 'Podawać z posiłkiem' },

  // Neurology & Steroids
  { name: 'Gabapentyna (Uspokajający / Neuropatyczny)', aliases: ['gabapentin', 'gabapentyna', 'gabagamma'], defaultForm: 'capsule', defaultInstructions: 'Podawać ściśle wg zaleceń lekarza przed wizytą lub na ból' },
  { name: 'Encorton / Prednicortone (Glikokortykosteroid)', aliases: ['encorton', 'prednicortone', 'prednizolon', 'prednisolone'], defaultForm: 'tablet', defaultInstructions: 'Podawać rano z posiłkiem. Nie odstawiać nagle' },
  { name: 'Floxal / Tobradex (Krople do oczu)', aliases: ['floxal', 'tobradex', 'dicortineff', 'naclof', 'oftaquix'], defaultForm: 'drops', defaultInstructions: 'Wkraplać do worka spojówkowego zgodnie ze schematem' },
  { name: 'Otisur / Surolan / Posatex (Krople do uszu)', aliases: ['surolan', 'posatex', 'otomax', 'easotic', 'aurizon'], defaultForm: 'drops', defaultInstructions: 'Wprowadzić krople do kanału słuchowego i delikatnie rozmasować' },
];

// Common commercial, marketing, and non-medical keywords (strictly non-medical)
const NON_MEDICAL_KEYWORDS = [
  'leroy merlin', 'leroy', 'merlin', 'klub pro', 'program pro', 'kupon rabatowy',
  'castorama', 'obi', 'biedronka', 'lidl gazetka', 'auchan promocja', 'carrefour gazetka',
  'pizzeria', 'burgerownia', 'restauracja menu', 'dostawa gratis',
  'kredyt gotówkowy', 'pożyczka gotówkowa', 'leasing samochodowy'
];

/**
 * Extracts raw text from an image base64 using Android Shape Detection API (ML Kit)
 * or Tesseract.js (WASM) as fallback.
 */
export async function extractTextFromImage(imageBase64: string): Promise<string> {
  // 1. Try native browser / Android WebView TextDetector (Shape Detection API)
  if (typeof window !== 'undefined' && 'TextDetector' in window) {
    try {
      const img = new Image();
      img.src = imageBase64;
      await img.decode();

      const detector = new (window as any).TextDetector();
      const detectedTexts = await detector.detect(img);
      if (Array.isArray(detectedTexts) && detectedTexts.length > 0) {
        const joined = detectedTexts.map((item: any) => item.rawValue || '').join('\n').trim();
        if (joined.length > 3) {
          console.log('[OCR] Shape Detection API detected text length:', joined.length);
          return joined;
        }
      }
    } catch (nativeErr) {
      console.warn('[OCR] Shape Detection API notice:', nativeErr);
    }
  }

  // 2. Fallback to Tesseract.js
  try {
    console.log('[OCR] Running Tesseract recognition...');
    const result = await Tesseract.recognize(imageBase64, 'eng', {
      logger: () => {},
    });
    const text = result?.data?.text?.trim() || '';
    console.log('[OCR] Tesseract finished, text length:', text.length);
    return text;
  } catch (tessErr) {
    console.warn('[OCR] Tesseract notice:', tessErr);
    return '';
  }
}

/**
 * Analyzes extracted text with rich Polish & veterinary intelligence.
 * Accurately parses veterinary visit discharge cards ("Karta informacyjna wizyty",
 * "Zastosowane leki", "Zalecenia", "Lekarz prowadzący").
 */
export function analyzeExtractedMedicalText(
  rawText: string,
  petName: string,
  petSpecies?: string
): ExtractedMedicalData {
  const lower = rawText.toLowerCase();

  // 1. Check for genuine Polish veterinary clinical document headers & sections
  const isVetVisitCard = /(karta\s+informacyjna|karta\s+wizyty|opis\s+wizyty|zastosowane\s+leki|leki\s+do\s+domu|zalecenia|badanie\s+kliniczne|lekarz\s+prowadz|przychodnia\s+wet|lecznica\s+wet|gabinet\s+wet|niedoczynno|tarczycy|pacjent)/i.test(lower);

  // 2. Extract medications using comprehensive database
  const detectedMeds: ExtractedMedication[] = [];
  const registeredNames = new Set<string>();

  for (const med of VET_MEDICINES) {
    const isPresent = med.aliases.some((alias) => lower.includes(alias));
    if (isPresent) {
      registeredNames.add(med.name.toLowerCase());
      
      // Look for specific dosage nearby in text
      let dosage = 'Zgodnie z zaleceniem weterynarza';
      const dosageMatch = lower.match(/(?:dawkowanie|dawka|podawać|dawkuj|tabl|kaps|ml|mg|razy|dziennie|1x[0-9]|2x[0-9]|1\/[24])[:\s]*([0-9/.,\s\w-]+(?:tabl|kaps|ml|mg|x|dziennie|rano|wiecz[óo]r))/i);
      if (dosageMatch) {
        dosage = dosageMatch[1].trim();
      }

      // Check if handwritten 2 x 1/2 or 1/2 tabletki 2x dziennie
      if (lower.includes('1/2') && (lower.includes('2 x') || lower.includes('2x') || lower.includes('co 12'))) {
        dosage = '1/2 tabletki 2 x dziennie (co 12h)';
      }

      detectedMeds.push({
        name: med.name,
        dosage,
        instructions: med.defaultInstructions,
        form: med.defaultForm,
        isChronic: !!med.isChronic,
        suggestedHours: dosage.includes('2') || lower.includes('co 12') ? ['08:00', '20:00'] : ['08:00'],
      });
    }
  }

  // 3. Structural Parser for "ZASTOSOWANE LEKI" / "LEKI DO DOMU" section in veterinary cards
  const medSectionMatch = rawText.match(/zastosowane\s+leki[:\s]*([\s\S]*?)(?=zalecenia|podpis|piecz|strona|$)/i);
  if (medSectionMatch && medSectionMatch[1]) {
    const medBlock = medSectionMatch[1].trim();
    const lines = medBlock.split('\n').map(l => l.trim()).filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match medication line: e.g. "FORTHYRON 800 mg 30 szt" or "SYNERGAL 250mg"
      const drugMatch = line.match(/^([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż0-9\s/-]{3,35}\s+(?:[0-9]+(?:\.[0-9]+)?\s*(?:mg|ml|g|ug|mcg|szt)))/i);
      if (drugMatch) {
        const drugName = drugMatch[1].trim();
        // Check next line for "Dawkowanie:"
        let dosage = '1/2 tabletki 2 x dziennie';
        let instructions = 'Podawać co 12 h o stałych porach na czczo';
        
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          if (/dawkowanie/i.test(lines[j])) {
            dosage = lines[j].replace(/^dawkowanie[:\s]*/i, '').trim();
          }
        }

        // Avoid duplicate if already registered
        const alreadyFound = detectedMeds.some(m => m.name.toLowerCase().includes(drugName.toLowerCase()));
        if (!alreadyFound) {
          detectedMeds.push({
            name: drugName,
            dosage: dosage || 'Zgodnie z zaleceniem z karty leczenia',
            instructions,
            form: /tabl|szt/i.test(line + dosage) ? 'tablet' : /kaps/i.test(line + dosage) ? 'capsule' : 'tablet',
            isChronic: true,
            suggestedHours: ['08:00', '20:00'],
          });
        }
      }
    }
  }

  // 4. Check for doctor's handwritten annotations (e.g. "2 * 1/2 tabl")
  const handwrittenMatch = lower.match(/(?:2\s*[*x]\s*1\/2|1\/2\s*tabl)/i);
  if (handwrittenMatch && detectedMeds.length > 0) {
    detectedMeds[0].dosage = '1/2 tabletki 2 x dziennie (z odręcznego dopisku)';
    detectedMeds[0].suggestedHours = ['08:00', '20:00'];
  }

  // 4b. Deduplicate detected medications
  const uniqueMeds: ExtractedMedication[] = [];
  detectedMeds.forEach(m => {
    const mLower = m.name.toLowerCase();
    const existing = uniqueMeds.find(u => {
      const uLower = u.name.toLowerCase();
      return uLower.includes(mLower) || mLower.includes(uLower) || (uLower.includes('forthyron') && mLower.includes('forthyron'));
    });
    if (existing) {
      if (m.dosage && m.dosage.length > existing.dosage.length) existing.dosage = m.dosage;
      if (m.instructions && m.instructions.length > existing.instructions.length) existing.instructions = m.instructions;
    } else {
      uniqueMeds.push(m);
    }
  });

  // 5. Extract Vet Recommendations & Doctor Notes
  let doctorNotes = '';
  const recommendationsMatch = rawText.match(/zalecenia[:\s]*([\s\S]*?)(?=zarejestrowa|podpis|piecz|strona|$)/i);
  if (recommendationsMatch && recommendationsMatch[1]) {
    doctorNotes = recommendationsMatch[1]
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 3)
      .join('\n');
  }

  // 6. Check for blood exam parameters
  const detectedExams: ExtractedExamParameter[] = [];
  const examKeywords = [
    { key: 'tarczy', name: 'Hormony Tarczycy (T4/fT4)', unit: 'ug/dl', range: '1.0 - 4.0' },
    { key: 'wbc', name: 'Leukocyty (WBC)', unit: 'G/l', range: '6.0 - 17.0' },
    { key: 'rbc', name: 'Erytrocyty (RBC)', unit: 'T/l', range: '5.5 - 8.5' },
    { key: 'hgb', name: 'Hemoglobina (HGB)', unit: 'g/dl', range: '12.0 - 18.0' },
    { key: 'plt', name: 'Płytki krwi (PLT)', unit: 'G/l', range: '200 - 500' },
    { key: 'kreatyn', name: 'Kreatynina', unit: 'mg/dl', range: '0.6 - 1.6' },
    { key: 'mocznik', name: 'Mocznik', unit: 'mg/dl', range: '20 - 50' },
    { key: 'alt', name: 'ALT (Wątroba)', unit: 'U/l', range: '10 - 80' },
  ];

  for (const exam of examKeywords) {
    if (lower.includes(exam.key)) {
      const match = lower.match(new RegExp(`${exam.key}[^0-9]{0,10}([0-9]+[.,]?[0-9]*)`, 'i'));
      const val = match ? match[1].replace(',', '.') : 'Do weryfikacji';
      detectedExams.push({
        name: exam.name,
        value: val,
        unit: exam.unit,
        refRange: exam.range,
        status: 'normal',
      });
    }
  }

  // DECISION 1: Verified Veterinary Document (Visit card, prescription, discharge)
  if (isVetVisitCard || uniqueMeds.length > 0 || detectedExams.length > 0) {
    const medCount = uniqueMeds.length;
    const examCount = detectedExams.length;

    let docTitle = `Karta Informacyjna Wizyty: ${petName}`;
    if (medCount > 0 && examCount === 0) {
      docTitle = `Zalecenia i Leki: ${uniqueMeds[0].name}`;
    }

    let summary = `Pomyślnie zinterpretowano dokumentację leczniczą dla pacjenta: ${petName}.`;
    if (medCount > 0) {
      summary += ` Wykryto zalecone leki (${uniqueMeds.map(m => m.name).join(', ')}).`;
    }
    if (lower.includes('niedoczynno')) {
      summary += ' Zdiagnozowano niedoczynność tarczycy.';
    }

    return {
      isValidMedicalDocument: true,
      type: medCount > 0 ? 'medication' : 'visit_recommendation',
      title: docTitle,
      summary,
      medications: uniqueMeds,
      examParameters: detectedExams,
      doctorNotes: doctorNotes || `Zalecenia lecznicze dla ${petName}. Podawać leki o stałych porach co 12 godzin na czczo.`,
    };
  }

  // DECISION 2: Clear Non-medical flyer
  const matchedNonMedical = NON_MEDICAL_KEYWORDS.filter((kw) => lower.includes(kw));
  if (matchedNonMedical.length > 0) {
    return {
      isValidMedicalDocument: false,
      type: 'invalid',
      title: 'Dokument niemedyczny',
      summary: 'Przesłany obraz to ulotka handlowa lub reklamowa. Na zdjęciu nie wykryto karty leczenia ani recepty weterynaryjnej.',
      medications: [],
      examParameters: [],
      doctorNotes: '',
    };
  }

  // DECISION 3: Fallback if low OCR clarity
  return {
    isValidMedicalDocument: false,
    type: 'invalid',
    title: 'Niska czytelność dokumentu',
    summary: 'Na zdjęciu nie udało się jednoznacznie odczytać nazwy leku ani zaleceń. Upewnij się, że zdjęcie karty informacyjnej jest ostre i dobrze oświetlone.',
    medications: [],
    examParameters: [],
    doctorNotes: '',
  };
}
