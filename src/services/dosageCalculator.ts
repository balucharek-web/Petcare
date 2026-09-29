import { Medication } from '../types/pet';

/**
 * Parses dosage string like "3/4 tabletki", "1/2 tab", "1.5", "2 tabletki", "0.75" into a numeric value.
 */
export function parseDoseToNumber(doseStr: string): number {
  if (!doseStr) return 0;
  const clean = doseStr.toLowerCase().trim();

  // Check for common unicode or fractions
  if (clean.includes('3/4') || clean.includes('¾')) return 0.75;
  if (clean.includes('1/2') || clean.includes('½')) return 0.5;
  if (clean.includes('1/4') || clean.includes('¼')) return 0.25;
  if (clean.includes('1/3') || clean.includes('⅓')) return 0.333;
  if (clean.includes('2/3') || clean.includes('⅔')) return 0.667;
  if (clean.includes('1 1/2') || clean.includes('1½')) return 1.5;
  if (clean.includes('1 1/4')) return 1.25;
  if (clean.includes('1 3/4')) return 1.75;
  if (clean.includes('2 1/2')) return 2.5;

  // Fraction like X/Y (e.g., 3/4)
  const fracMatch = clean.match(/(\d+)\s*\/\s*(\d+)/);
  if (fracMatch) {
    const num = parseFloat(fracMatch[1]);
    const den = parseFloat(fracMatch[2]);
    if (den !== 0) return num / den;
  }

  // Mixed number like "1 and 1/2" or "1 3/4"
  const mixedMatch = clean.match(/(\d+)\s+(\d+)\/(\d+)/);
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1]);
    const num = parseFloat(mixedMatch[2]);
    const den = parseFloat(mixedMatch[3]);
    if (den !== 0) return whole + (num / den);
  }

  // Decimal or integer like "0.75", "1.5", "2", "3"
  const numMatch = clean.replace(',', '.').match(/(\d+(\.\d+)?)/);
  if (numMatch) {
    return parseFloat(numMatch[1]);
  }

  return 1; // fallback default
}

/**
 * Calculates monthly and duration requirements for a medication
 */
export function calculateMedicationDemand(med: Medication, daysInMonth = 30) {
  // Sum daily units
  const dailyUnits = med.timesOfDay.reduce((sum, slot) => {
    return sum + parseDoseToNumber(slot.amount);
  }, 0);

  const monthlyUnits = dailyUnits * daysInMonth;
  const packagesNeededMonthly = med.packageSize && med.packageSize > 0 
    ? Math.ceil(monthlyUnits / med.packageSize) 
    : undefined;

  let totalCourseUnits: number | undefined;
  let totalCourseDays: number | undefined;

  if (med.startDate && med.endDate && !med.isChronic) {
    const start = new Date(med.startDate);
    const end = new Date(med.endDate);
    const diffTime = end.getTime() - start.getTime();
    const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
    totalCourseDays = days;
    totalCourseUnits = dailyUnits * days;
  }

  // Days remaining with current stock
  const daysLeftWithStock = med.currentStock !== undefined && dailyUnits > 0
    ? Math.floor(med.currentStock / dailyUnits)
    : undefined;

  return {
    dailyUnits: Math.round(dailyUnits * 100) / 100,
    monthlyUnits: Math.round(monthlyUnits * 10) / 10,
    packagesNeededMonthly,
    totalCourseDays,
    totalCourseUnits: totalCourseUnits ? Math.round(totalCourseUnits * 10) / 10 : undefined,
    daysLeftWithStock,
  };
}

/**
 * Format decimal/fraction for display (e.g. 0.75 -> "3/4", 1.5 -> "1 ½")
 */
export function formatUnitsDisplay(val: number): string {
  if (val === 0.75) return '¾ (0.75)';
  if (val === 0.5) return '½ (0.5)';
  if (val === 0.25) return '¼ (0.25)';
  if (val === 1.5) return '1 ½ (1.5)';
  if (val === 1.75) return '1 ¾ (1.75)';
  if (val === 2.5) return '2 ½ (2.5)';
  return `${val}`;
}

/**
 * Returns a human-friendly Polish unit label for medication form and count.
 */
export function getMedicationUnitLabel(form: Medication['form'], count: number): string {
  switch (form) {
    case 'liquid':
      return 'ml';
    case 'drops':
      return count === 1 ? 'kropla' : (count >= 2 && count <= 4) ? 'krople' : 'kropli';
    case 'capsule':
      return count === 1 ? 'kapsułka' : (count >= 2 && count <= 4) ? 'kapsułki' : 'kapsułek';
    case 'ointment':
      return count === 1 ? 'aplikacja' : (count >= 2 && count <= 4) ? 'aplikacje' : 'aplikacji';
    case 'injection':
      return 'ml';
    case 'paste':
      return 'cm pasty';
    case 'powder':
      return count === 1 ? 'porcja' : (count >= 2 && count <= 4) ? 'porcje' : 'porcji';
    case 'tablet':
    default:
      return count === 1 ? 'tabletka' : (count >= 2 && count <= 4) ? 'tabletki' : 'tabletek';
  }
}

/**
 * Returns appropriate emoji icon for the medication form.
 */
export function getMedicationIcon(form: Medication['form']): string {
  switch (form) {
    case 'liquid':
      return '🧪';
    case 'drops':
      return '💧';
    case 'ointment':
      return '🧴';
    case 'injection':
      return '💉';
    case 'paste':
      return '🪥';
    case 'powder':
      return '🧂';
    case 'capsule':
      return '💊';
    case 'tablet':
    default:
      return '💊';
  }
}
