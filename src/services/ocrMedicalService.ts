import Tesseract from 'tesseract.js';

export interface ExtractedMedication {
  name: string;
  dosage: string;
  instructions: string;
  form: 'tablet' | 'capsule' | 'liquid' | 'drops' | 'ointment' | 'injection' | 'other';
  isChronic: boolean;
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
}> = [
  { name: 'Synulox (Amoksycylina + Kw. klawulanowy)', aliases: ['synulox', 'amoksycylina', 'amoxicillin', 'clavulanic'], defaultForm: 'tablet', defaultInstructions: 'Podawać z karmą w stałych odstępach czasu' },
  { name: 'Kesium (Antybiotyk weterynaryjny)', aliases: ['kesium', 'clavaseptin', 'clavubactin'], defaultForm: 'tablet', defaultInstructions: 'Podawać bezpośrednio do pyszczka lub z posiłkiem' },
  { name: 'Amotaks (Amoksycylina)', aliases: ['amotaks', 'amoxicilline'], defaultForm: 'tablet', defaultInstructions: 'Zalecana kuracja przez wyznaczoną liczbę dni' },
  { name: 'Metacam (Meloksykam - p/bólowy i p/zapalny)', aliases: ['metacam', 'meloksykam', 'meloxicam', 'meloxidyl', 'loxicom', 'inflacam'], defaultForm: 'liquid', defaultInstructions: 'Podawać raz dziennie z posiłkiem' },
  { name: 'Onsior (Robenakoksib - p/bólowy)', aliases: ['onsior', 'robenakoksib', 'robenacoxib'], defaultForm: 'tablet', defaultInstructions: 'Podawać o stałej porze bez jedzenia lub z małym kęsem' },
  { name: 'Apoquel (Oklacytynib - p/świądowy)', aliases: ['apoquel', 'oklacytynib', 'oclacitinib'], defaultForm: 'tablet', defaultInstructions: 'Podawać według zaleceń dermatologa weterynaryjnego' },
  { name: 'Bravecto (Fluralaner - p/kleszczowy)', aliases: ['bravecto', 'fluralaner'], defaultForm: 'tablet', defaultInstructions: 'Podać w trakcie lub bezpośrednio po posiłku' },
  { name: 'Nexgard Spectra (Afoksolaner + Milbemycyna)', aliases: ['nexgard', 'spectra', 'afoxolaner'], defaultForm: 'tablet', defaultInstructions: 'Podać jako smaczek raz w miesiącu' },
  { name: 'Simparica (Sarolaner - kleszcze i pchły)', aliases: ['simparica', 'sarolaner', 'credelio'], defaultForm: 'tablet', defaultInstructions: 'Podać raz w miesiącu profilaktycznie' },
  { name: 'Milpro / Milprazon (Odrobaczenie)', aliases: ['milpro', 'milprazon', 'milbemycin', 'drontal', 'dehinel'], defaultForm: 'tablet', defaultInstructions: 'Podać na czczo lub z małym kęsem karmy' },
  { name: 'Vetmedin / Cardisure (Pimobendan - serce)', aliases: ['vetmedin', 'cardisure', 'pimobendan'], defaultForm: 'tablet', defaultInstructions: 'Podać na czczo około 1h przed karmieniem' },
  { name: 'Semintra (Telmisartan - nerki kota)', aliases: ['semintra', 'telmisartan', 'pronefra', 'ipakitine'], defaultForm: 'liquid', defaultInstructions: 'Podawać raz dziennie doustnie za pomocą strzykawki' },
  { name: 'Cerenia (Maropitant - p/wymiotny)', aliases: ['cerenia', 'maropitant'], defaultForm: 'tablet', defaultInstructions: 'Podać z niewielką ilością karmy min. 2h przed podróżą' },
  { name: 'Flora Defense / FortiFlora (Probiotyk)', aliases: ['flora defense', 'fortiflora', 'probiotyk', 'synbiotyk', 'dia dog'], defaultForm: 'capsule', defaultInstructions: 'Wysypać zawartość kapsułki/saszetki na wilgotną karmę' },
  { name: 'Gabapentyna (Uspokajający / Neuropatyczny)', aliases: ['gabapentin', 'gabapentyna', 'gabagamma'], defaultForm: 'capsule', defaultInstructions: 'Podawać ściśle wg zaleceń lekarza przed wizytą lub na ból' },
  { name: 'Encorton / Prednicortone (Glikokortykosteroid)', aliases: ['encorton', 'prednicortone', 'prednizolon', 'prednisolone'], defaultForm: 'tablet', defaultInstructions: 'Podawać rano z posiłkiem. Nie odstawiać nagle' },
  { name: 'Floxal / Tobradex (Krople do oczu)', aliases: ['floxal', 'tobradex', 'dicortineff', 'naclof', 'oftaquix'], defaultForm: 'drops', defaultInstructions: 'Wkraplać do worka spojówkowego zgodnie ze schematem' },
  { name: 'Otisur / Surolan / Posatex (Krople do uszu)', aliases: ['surolan', 'posatex', 'otomax', 'easotic', 'aurizon'], defaultForm: 'drops', defaultInstructions: 'Wprowadzić krople do kanału słuchowego i delikatnie rozmasować' },
];

// Common commercial, marketing, and non-medical keywords
const NON_MEDICAL_KEYWORDS = [
  'leroy merlin', 'leroy', 'merlin', 'klub pro', 'program pro', 'kupon', 'kupony', 'punkty',
  'castorama', 'obi', 'biedronka', 'lidl', 'auchan', 'carrefour', 'dino', 'żabka',
  'gazetka', 'promocja', 'promocje', 'rabat', 'rabaty', 'wyprzedaż', 'oferta ważna',
  'pizza', 'pizzeria', 'burger', 'kebab', 'restauracja', 'menu', 'dostawa', 'cennik',
  'kredyt', 'pożyczka', 'leasing', 'ubezpieczenie oc', 'faktura vat', 'paragon niefiskalny',
  'remont', 'budowlany', 'narzędzia', 'elektronarzędzia', 'farba', 'płytki', 'glazura',
  'meble', 'materac', 'ogród', 'kosiarka', 'odzież', 'sukienka', 'spodnie', 'obuwie'
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
        const joined = detectedTexts.map((item: any) => item.rawValue || '').join(' ').trim();
        if (joined.length > 3) {
          console.log('[OCR] Shape Detection API detected text length:', joined.length);
          return joined;
        }
      }
    } catch (nativeErr) {
      console.warn('[OCR] Shape Detection API notice:', nativeErr);
    }
  }

  // 2. Fallback to Tesseract.js (Runs client-side in browser & Capacitor)
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
 * Analyzes extracted text with Polish & veterinary intelligence.
 * Strictly discriminates between flyers/leaflets and genuine medical documents.
 */
export function analyzeExtractedMedicalText(
  rawText: string,
  petName: string,
  petSpecies?: string
): ExtractedMedicalData {
  const lower = rawText.toLowerCase();

  // 1. Check for commercial, promotional or retail keywords (e.g. Leroy Merlin flyer)
  const matchedNonMedical = NON_MEDICAL_KEYWORDS.filter((kw) => lower.includes(kw));

  // 2. Check for veterinary medicines or medical terms
  const detectedMeds: ExtractedMedication[] = [];
  for (const med of VET_MEDICINES) {
    const isPresent = med.aliases.some((alias) => lower.includes(alias));
    if (isPresent) {
      // Look for dosage hints nearby
      let dosage = 'Zgodnie z zaleceniem weterynarza';
      const dosageMatch = lower.match(/(?:dawka|podawać|dawkuj|tabl|kaps|ml|mg|razy|dziennie)[:\s]*([0-9/.,\s\w-]+(?:tabl|kaps|ml|mg|x|dziennie|rano|wiecz[óo]r))/i);
      if (dosageMatch) {
        dosage = dosageMatch[1].trim();
      }

      detectedMeds.push({
        name: med.name,
        dosage,
        instructions: med.defaultInstructions,
        form: med.defaultForm,
        isChronic: false,
      });
    }
  }

  // 3. Check for blood exam parameters
  const detectedExams: ExtractedExamParameter[] = [];
  const examKeywords = [
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
      const val = match ? match[1].replace(',', '.') : 'W normie';
      detectedExams.push({
        name: exam.name,
        value: val,
        unit: exam.unit,
        refRange: exam.range,
        status: 'normal',
      });
    }
  }

  // DECISION 1: Clear non-medical flyer / retail leaflet
  if (matchedNonMedical.length > 0 && detectedMeds.length === 0 && detectedExams.length === 0) {
    const detectedNames = matchedNonMedical.slice(0, 3).join(', ');
    return {
      isValidMedicalDocument: false,
      type: 'invalid',
      title: 'Dokument niemedyczny (Ulotka / Reklama)',
      summary: `Przesłany obraz to ulotka handlowa lub reklamowa (${detectedNames}). Na zdjęciu nie wykryto recepty weterynaryjnej, opakowania leku ani zaleceń leczniczych dla zwierzaka.`,
      medications: [],
      examParameters: [],
      doctorNotes: '',
    };
  }

  // DECISION 2: Genuine medical items detected
  if (detectedMeds.length > 0 || detectedExams.length > 0) {
    const isExamOnly = detectedMeds.length === 0 && detectedExams.length > 0;
    return {
      isValidMedicalDocument: true,
      type: isExamOnly ? 'exam_blood' : 'medication',
      title: isExamOnly ? `Wyniki badań: ${petName}` : `Zalecenia i leki dla: ${petName}`,
      summary: `Odczytano dokument medyczny dla ${petName}. Wykryto ${detectedMeds.length} leków oraz ${detectedExams.length} parametrów badań.`,
      medications: detectedMeds,
      examParameters: detectedExams,
      doctorNotes: `Zalecenia weterynaryjne dla pacjenta ${petName} (${petSpecies || 'zwierzak'}).`,
    };
  }

  // DECISION 3: No clear text or no medical keywords
  return {
    isValidMedicalDocument: false,
    type: 'invalid',
    title: 'Brak leków weterynaryjnych',
    summary: rawText.length > 15
      ? 'Przesłany tekst nie zawiera nazw leków weterynaryjnych ani zaleceń z lecznicy. Upewnij się, że fotografujesz receptę lub opakowanie leku.'
      : 'Na zdjęciu nie wykryto czytelnego tekstu recepty ani opakowania leku. Zrób ostre zdjęcie z bliska w dobrym oświetleniu.',
    medications: [],
    examParameters: [],
    doctorNotes: '',
  };
}
