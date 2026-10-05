/** Normalizes Gemini output of the medical document scanner so that guesses are never presented as facts. */
export function normalizeMedicalScan(raw: any): any {
  const parsed = raw && typeof raw === 'object' ? { ...raw } : {};

  if (!Array.isArray(parsed.medications)) parsed.medications = [];
  if (!Array.isArray(parsed.examParameters)) parsed.examParameters = [];
  if (!Array.isArray(parsed.recommendations)) parsed.recommendations = [];

  const rawText = typeof parsed.detectedRawText === 'string' ? parsed.detectedRawText.trim() : '';
  const hasMeds = parsed.medications.length > 0;
  const hasExams = parsed.examParameters.length > 0;
  const hasDiagnosis = typeof parsed.diagnosis === 'string' && parsed.diagnosis.trim().length > 0;
  const hasRecs = parsed.recommendations.length > 0;
  const hasVisit = !!(parsed.visitInfo && (parsed.visitInfo.doctorName || parsed.visitInfo.date));
  const hasContent = hasMeds || hasExams || hasDiagnosis || hasRecs || hasVisit;

  // The model explicitly said this is not a document, or "found" data without reading any text:
  // treat everything it produced as hallucinated.
  if (parsed.isValidMedicalDocument === false || parsed.type === 'invalid' || (hasContent && rawText.length < 10)) {
    return {
      isValidMedicalDocument: false,
      type: 'invalid',
      title: 'Nie rozpoznano dokumentu',
      summary:
        typeof parsed.summary === 'string' && parsed.summary.trim() && parsed.isValidMedicalDocument === false
          ? parsed.summary
          : 'Na zdjęciu nie rozpoznano czytelnego dokumentu weterynaryjnego. Zrób ostre zdjęcie recepty, karty wizyty, wyników badań lub opakowania leku.',
      confidence: 'estimated',
      detectedRawText: rawText,
      medications: [],
      examParameters: [],
      recommendations: [],
    };
  }

  if (hasContent) {
    parsed.isValidMedicalDocument = true;
    if (!parsed.type) parsed.type = hasMeds ? 'medication' : hasExams ? 'exam_blood' : 'visit_recommendation';
  }

  if (parsed.visitInfo && parsed.visitInfo.date) {
    const dmy = String(parsed.visitInfo.date).trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
    if (dmy) parsed.visitInfo.date = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }

  return parsed;
}
