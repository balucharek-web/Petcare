import { jsPDF } from 'jspdf';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Pet, Vaccination, Medication, MedicalExam, MedicalCondition, VetVisit } from '../types/pet';
import { LIBERATION_SANS_REGULAR, LIBERATION_SANS_BOLD } from './pdfFonts';

interface NativePrintPluginInterface {
  print(options?: { jobName?: string }): Promise<{ success: boolean }>;
  saveAndOpenPdf(options: { base64: string; fileName: string }): Promise<{ success: boolean; message?: string }>;
  sharePdf(options: { base64: string; fileName: string }): Promise<{ success: boolean }>;
}

const NativePrint = registerPlugin<NativePrintPluginInterface>('NativePrint');

/**
 * Triggers native system printing (Android Print Spooler or browser print dialog).
 */
export async function triggerPrint(jobName = 'PetCare-Raport-Medyczny'): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      await NativePrint.print({ jobName });
      return true;
    }
  } catch (err) {
    console.warn('[triggerPrint] Native print error, falling back to window.print():', err);
  }

  // Fallback for Web/PWA
  if (typeof window !== 'undefined') {
    window.print();
    return true;
  }
  return false;
}

interface ReportData {
  pet: Pet;
  vaccinations?: Vaccination[];
  medications?: Medication[];
  exams?: MedicalExam[];
  conditions?: MedicalCondition[];
  visits?: VetVisit[];
}

function calculateAge(birthDate?: string): string {
  if (!birthDate) return '-';
  const birth = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    years--;
    months += 12;
  }
  if (years === 0) return `${months} mies.`;
  return `${years} lat ${months > 0 ? `${months} mies.` : ''}`;
}

/**
 * Setup Polish UTF-8 TrueType fonts in jsPDF instance.
 */
function setupPolishFonts(doc: jsPDF): void {
  try {
    doc.addFileToVFS('LiberationSans-Regular.ttf', LIBERATION_SANS_REGULAR);
    doc.addFont('LiberationSans-Regular.ttf', 'LiberationSans', 'normal');
    doc.addFileToVFS('LiberationSans-Bold.ttf', LIBERATION_SANS_BOLD);
    doc.addFont('LiberationSans-Bold.ttf', 'LiberationSans', 'bold');
    doc.setFont('LiberationSans', 'normal');
  } catch (err) {
    console.warn('[setupPolishFonts] Failed to load custom TrueType fonts, falling back:', err);
  }
}

/**
 * Builds a beautifully formatted jsPDF document with full Polish character support
 * and bulletproof multi-line layout that never overlaps.
 */
export function buildPetMedicalReportPdf(data: ReportData): jsPDF {
  const { pet, vaccinations = [], medications = [], exams = [], conditions = [], visits = [] } = data;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Inject Polish UTF-8 TrueType fonts
  setupPolishFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = 16;
      // Header for next page
      doc.setFont('LiberationSans', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(`Karta Pacjenta Weterynaryjnego: ${pet.name} | PetCare`, margin, 10);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 12, pageWidth - margin, 12);
    }
  };

  // --- TOP ACCENT HEADER BAR ---
  doc.setFillColor(13, 148, 136); // Teal-600
  doc.rect(margin, y, contentWidth, 20, 'F');

  doc.setFont('LiberationSans', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('KARTA ZDROWIA PACJENTA WETERYNARYJNEGO', margin + 6, y + 8.5);

  doc.setFont('LiberationSans', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(230, 255, 250);
  doc.text(
    `Raport medyczny wygenerowany z aplikacji PetCare w dniu ${new Date().toLocaleDateString('pl-PL')}`,
    margin + 6,
    y + 14.5
  );

  y += 26;

  // --- PET BASICS BLOCK ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 38, 3, 3, 'FD');

  doc.setFont('LiberationSans', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(pet.name, margin + 6, y + 9);

  doc.setFont('LiberationSans', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const speciesLabel = pet.species === 'dog' ? 'Pies' : pet.species === 'cat' ? 'Kot' : pet.species;
  const genderLabel = pet.gender === 'female' ? 'Samica' : 'Samiec';
  const neuteredLabel = pet.isNeutered ? 'Kastrowany/a: TAK' : 'Kastrowany/a: NIE';
  doc.text(`${speciesLabel} • ${pet.breed || 'Rasa nieokreślona'} • ${genderLabel} • ${neuteredLabel}`, margin + 6, y + 15);

  // Vital grid
  doc.setFontSize(8.5);
  doc.setFont('LiberationSans', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Wiek:', margin + 6, y + 23);
  doc.text('Waga aktualna:', margin + 48, y + 23);
  doc.text('Mikroczip:', margin + 98, y + 23);
  doc.text('Nr paszportu:', margin + 140, y + 23);

  doc.setFont('LiberationSans', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`${calculateAge(pet.birthDate)} (${pet.birthDate || '-'})`, margin + 6, y + 29);
  doc.text(`${pet.weightKg ? `${pet.weightKg} kg` : '-'}`, margin + 48, y + 29);
  doc.text(`${pet.chipNumber || 'Brak wpisu'}`, margin + 98, y + 29);
  doc.text(`${pet.passportNumber || 'Brak wpisu'}`, margin + 140, y + 29);

  y += 43;

  // --- ALLERGIES & WARNINGS BANNER ---
  if (pet.allergies || pet.specialNotes) {
    const alertText = [
      pet.allergies ? `Alergie: ${pet.allergies}` : null,
      pet.specialNotes ? `Uwagi: ${pet.specialNotes}` : null,
    ].filter(Boolean).join(' | ');

    doc.setFont('LiberationSans', 'normal');
    doc.setFontSize(8.5);
    const alertLines = doc.splitTextToSize(alertText || 'Brak znanych alergii', contentWidth - 12);
    const boxHeight = Math.max(18, 9 + alertLines.length * 4.5);

    ensureSpace(boxHeight + 4);
    doc.setFillColor(254, 242, 242); // Red-50
    doc.setDrawColor(248, 113, 113); // Red-400
    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('LiberationSans', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28);
    doc.text('! ALERGIE, REAKCJE NIEPOŻĄDANE I SPECJALNE OSTRZEŻENIA:', margin + 5, y + 6);

    doc.setFont('LiberationSans', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(153, 27, 27);
    doc.text(alertLines, margin + 5, y + 12);
    y += boxHeight + 5;
  }

  // --- VET CONTACT BLOCK ---
  if (pet.vetClinicName || pet.vetPhone || pet.emergencyClinicPhone) {
    const clinic = pet.vetClinicName ? `Klinika: ${pet.vetClinicName}` : 'Klinika prowadząca';
    const doctor = pet.vetDoctorName ? `Lekarz: ${pet.vetDoctorName}` : '';
    const phone = pet.vetPhone ? `Tel: ${pet.vetPhone}` : '';
    const emPhone = pet.emergencyClinicPhone ? `Dyżur 24h: ${pet.emergencyClinicPhone}` : '';
    const contactLine = [clinic, doctor, phone, emPhone].filter(Boolean).join(' | ');

    doc.setFont('LiberationSans', 'normal');
    doc.setFontSize(8.5);
    const contactLines = doc.splitTextToSize(contactLine, contentWidth - 12);
    const boxHeight = Math.max(18, 9 + contactLines.length * 4.5);

    ensureSpace(boxHeight + 4);
    doc.setFillColor(240, 253, 250); // Teal-50
    doc.setDrawColor(94, 234, 212); // Teal-300
    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('LiberationSans', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 118, 110);
    doc.text('PROWADZĄCY GABINET WETERYNARYJNY I KONTAKT:', margin + 5, y + 6);

    doc.setFont('LiberationSans', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(17, 94, 89);
    doc.text(contactLines, margin + 5, y + 12);
    y += boxHeight + 5;
  }

  // Helper to render section title
  const renderSectionHeader = (title: string, count?: number) => {
    ensureSpace(12);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('LiberationSans', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`${title} ${count !== undefined ? `(${count})` : ''}`, margin + 3, y + 5);
    y += 9;
  };

  // --- MEDICATIONS TABLE ---
  const activeMeds = medications.filter(m => m.isActive);
  renderSectionHeader('PRZYJMOWANE LEKI I SUPLEMENTY', activeMeds.length);

  if (activeMeds.length === 0) {
    ensureSpace(8);
    doc.setFont('LiberationSans', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Brak stale przyjmowanych leków zarejestrowanych w systemie.', margin + 3, y + 4);
    y += 8;
  } else {
    // Table header
    doc.setFont('LiberationSans', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Nazwa leku', margin + 3, y + 3);
    doc.text('Dawka i częstotliwość', margin + 55, y + 3);
    doc.text('Zalecenia i podawanie', margin + 115, y + 3);
    y += 5;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 2;

    activeMeds.forEach(m => {
      const schedule = m.timesOfDay?.length 
        ? m.timesOfDay.map(t => `${t.label} ${t.time}`).join(', ')
        : (m.isChronic ? 'Lek stały' : 'Wg zaleceń');

      doc.setFont('LiberationSans', 'normal');
      doc.setFontSize(8.5);

      const col1Lines = doc.splitTextToSize(m.name, 50);
      const col2Lines = doc.splitTextToSize(`${m.dosage} (${schedule})`, 56);
      const col3Lines = doc.splitTextToSize(m.instructions || m.notes || '-', 64);
      const maxLines = Math.max(col1Lines.length, col2Lines.length, col3Lines.length);
      const rowHeight = Math.max(7, maxLines * 4.3 + 3);

      ensureSpace(rowHeight + 2);

      doc.setFont('LiberationSans', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(col1Lines, margin + 3, y + 3.5);

      doc.setFont('LiberationSans', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(col2Lines, margin + 55, y + 3.5);
      doc.text(col3Lines, margin + 115, y + 3.5);

      y += rowHeight;
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y, pageWidth - margin, y);
    });
    y += 4;
  }

  // --- VACCINATIONS TABLE ---
  renderSectionHeader('HISTORIA SZCZEPIEŃ', vaccinations.length);

  if (vaccinations.length === 0) {
    ensureSpace(8);
    doc.setFont('LiberationSans', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Brak wpisów dotyczących szczepień.', margin + 3, y + 4);
    y += 8;
  } else {
    doc.setFont('LiberationSans', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Szczepienie / Choroba', margin + 3, y + 3);
    doc.text('Data podania', margin + 68, y + 3);
    doc.text('Ważne do', margin + 100, y + 3);
    doc.text('Nr serii / Weterynarz', margin + 135, y + 3);
    y += 5;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 2;

    vaccinations.forEach(v => {
      doc.setFont('LiberationSans', 'normal');
      doc.setFontSize(8.5);

      const nameLines = doc.splitTextToSize(v.name, 62);
      const vetInfo = [v.batchNumber ? `Seria: ${v.batchNumber}` : null, v.vetDoctor || v.vetClinic].filter(Boolean).join(' | ');
      const vetLines = doc.splitTextToSize(vetInfo || '-', 46);
      const maxLines = Math.max(nameLines.length, vetLines.length, 1);
      const rowHeight = Math.max(7, maxLines * 4.3 + 3);

      ensureSpace(rowHeight + 2);

      doc.setFont('LiberationSans', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(nameLines, margin + 3, y + 3.5);

      doc.setFont('LiberationSans', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(v.dateAdministered || '-', margin + 68, y + 3.5);
      doc.text(v.validUntil || '-', margin + 100, y + 3.5);
      doc.text(vetLines, margin + 135, y + 3.5);

      y += rowHeight;
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y, pageWidth - margin, y);
    });
    y += 4;
  }

  // --- CONDITIONS & CHRONIC DISEASES ---
  if (conditions.length > 0) {
    renderSectionHeader('CHOROBY I ZDIAGNOZOWANE STANY PRZEWLEKŁE', conditions.length);
    conditions.forEach(c => {
      doc.setFont('LiberationSans', 'normal');
      doc.setFontSize(8.5);
      const statusLabel = c.status === 'active' ? 'Aktywna' : c.status === 'chronic' ? 'Przewlekła' : c.status === 'cured' ? 'Wyleczona' : c.status;
      const descLine = `Terapia: ${c.treatment || 'obserwacja'} | Status: ${statusLabel}`;
      const descLines = doc.splitTextToSize(descLine, contentWidth - 10);
      const rowHeight = 7 + descLines.length * 4.2;

      ensureSpace(rowHeight + 3);
      doc.setFont('LiberationSans', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`• ${c.name} (od: ${c.diagnosisDate || '-'})`, margin + 3, y + 3.5);

      doc.setFont('LiberationSans', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(descLines, margin + 6, y + 8);
      y += rowHeight + 2;
    });
    y += 3;
  }

  // --- RECENT MEDICAL EXAMS ---
  if (exams.length > 0) {
    renderSectionHeader('OSTATNIE BADANIA KLINICZNE I LABORATORYJNE', exams.length);
    exams.slice(0, 10).forEach(e => {
      doc.setFont('LiberationSans', 'normal');
      doc.setFontSize(8);
      const summaryText = `Wynik / Uwagi: ${e.summary || '-'}`;
      const summaryLines = doc.splitTextToSize(summaryText, contentWidth - 10);
      const rowHeight = 7 + summaryLines.length * 4.2;

      ensureSpace(rowHeight + 3);
      doc.setFont('LiberationSans', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`• ${e.title} (${e.date})`, margin + 3, y + 3.5);

      doc.setFont('LiberationSans', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(summaryLines, margin + 6, y + 8);
      y += rowHeight + 2;
    });
    y += 3;
  }

  // --- VET VISITS HISTORY ---
  if (visits.length > 0) {
    renderSectionHeader('HISTORIA WIZYT WETERYNARYJNYCH', visits.length);
    visits.slice(0, 10).forEach(v => {
      const visitSummary = [
        v.diagnosis ? `Diagnoza: ${v.diagnosis}` : null,
        v.treatmentGiven ? `Zabieg/Leki: ${v.treatmentGiven}` : null,
        v.notes ? `Notatki: ${v.notes}` : null
      ].filter(Boolean).join(' | ');

      doc.setFont('LiberationSans', 'normal');
      doc.setFontSize(8);
      const summaryLines = doc.splitTextToSize(visitSummary || 'Wizyta zrealizowana', contentWidth - 10);
      const rowHeight = 7 + summaryLines.length * 4.2;

      ensureSpace(rowHeight + 3);
      doc.setFont('LiberationSans', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`• ${v.date} - ${v.reason || 'Wizyta kontrolna'} (${v.clinic || 'Gabinet'})`, margin + 3, y + 3.5);

      doc.setFont('LiberationSans', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(summaryLines, margin + 6, y + 8);
      y += rowHeight + 2;
    });
    y += 3;
  }

  // --- FOOTER ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('LiberationSans', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `PetCare • Elektroniczna Książeczka Zdrowia • Strona ${p} z ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  return doc;
}

/**
 * Downloads the pet's medical report directly as a PDF file, or on Android saves to Downloads and opens in default PDF viewer.
 */
export async function downloadPetMedicalReportPdf(data: ReportData): Promise<void> {
  const doc = buildPetMedicalReportPdf(data);
  const cleanName = (data.pet.name || 'pupil').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Karta_Zdrowia_${cleanName}.pdf`;

  if (Capacitor.isNativePlatform()) {
    try {
      const dataUri = doc.output('datauristring');
      await NativePrint.saveAndOpenPdf({ base64: dataUri, fileName: filename });
      return;
    } catch (err) {
      console.warn('[downloadPetMedicalReportPdf] Native save failed, trying browser fallback:', err);
    }
  }

  // On Web browser
  doc.save(filename);
}

/**
 * Shares the generated PDF file via the native Android Share sheet (WhatsApp, Email, Drive).
 */
export async function sharePetMedicalReportPdf(data: ReportData): Promise<boolean> {
  const doc = buildPetMedicalReportPdf(data);
  const cleanName = (data.pet.name || 'pupil').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Karta_Zdrowia_${cleanName}.pdf`;

  if (Capacitor.isNativePlatform()) {
    try {
      const dataUri = doc.output('datauristring');
      await NativePrint.sharePdf({ base64: dataUri, fileName: filename });
      return true;
    } catch (err) {
      console.warn('[sharePetMedicalReportPdf] Native share error, falling back:', err);
    }
  }

  // Web browser fallback
  try {
    const blob = doc.output('blob');
    const file = new File([blob], filename, { type: 'application/pdf' });

    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `Karta Zdrowia: ${data.pet.name}`,
        text: `Karta zdrowia i historia medyczna zwierzaka ${data.pet.name} wygenerowana z PetCare.`,
      });
      return true;
    }
  } catch (err) {
    console.warn('[sharePetMedicalReportPdf] Web share failed, falling back to download:', err);
  }

  // Fallback to normal download
  await downloadPetMedicalReportPdf(data);
  return true;
}
