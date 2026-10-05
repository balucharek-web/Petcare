import { describe, expect, it } from 'vitest';
import { normalizeMedicalScan } from '../aiResult';

describe('normalizeMedicalScan', () => {
  it('drops hallucinated data when the model says the image is not a document', () => {
    const out = normalizeMedicalScan({
      isValidMedicalDocument: false,
      summary: 'Białe, puste zdjęcie.',
      medications: [{ name: 'FORTHYRON 800 mg' }],
      diagnosis: 'Niedoczynność tarczycy',
    });
    expect(out.isValidMedicalDocument).toBe(false);
    expect(out.medications).toEqual([]);
    expect(out.diagnosis).toBeUndefined();
    expect(out.summary).toBe('Białe, puste zdjęcie.');
  });

  it('rejects "found" medications when no text was read from the image', () => {
    const out = normalizeMedicalScan({ medications: [{ name: 'Lek' }], detectedRawText: '' });
    expect(out.isValidMedicalDocument).toBe(false);
    expect(out.medications).toEqual([]);
  });

  it('keeps real results and normalizes Polish dates', () => {
    const out = normalizeMedicalScan({
      medications: [{ name: 'Forthyron 400' }],
      detectedRawText: 'Forthyron 400 1/2 tabl 2x dziennie, data 12/03/2026',
      visitInfo: { date: '12/03/2026' },
    });
    expect(out.isValidMedicalDocument).toBe(true);
    expect(out.type).toBe('medication');
    expect(out.visitInfo.date).toBe('2026-03-12');
    expect(out.examParameters).toEqual([]);
  });
});
