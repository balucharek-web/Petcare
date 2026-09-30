import { jsPDF } from 'jspdf';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Pet, Vaccination, Medication, MedicalExam, MedicalCondition, VetVisit } from '../types/pet';

interface NativePrintPluginInterface {
  print(options?: { jobName?: string }): Promise<{ success: boolean }>;
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
 * Builds a formatted jsPDF document with the pet's complete medical history.
 */
export function buildPetMedicalReportPdf(data: ReportData): jsPDF {
  const { pet, vaccinations = [], medications = [], exams = [], conditions = [], visits = [] } = data;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

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
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(`Karta Pacjenta Weterynaryjnego: ${pet.name} | PetCare`, margin, 10);
      doc.line(margin, 12, pageWidth - margin, 12);
    }
  };

  // --- TOP ACCENT HEADER BAR ---
  doc.setFillColor(13, 148, 136); // Teal-600
  doc.rect(margin, y, contentWidth, 20, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('KARTA ZDROWIA PACJENTA WETERYNARYJNEGO', margin + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(230, 255, 250);
  doc.text(
    `Raport medyczny wygenerowany z aplikacji PetCare w dniu ${new Date().toLocaleDateString('pl-PL')}`,
    margin + 6,
    y + 14
  );

  y += 26;

  // --- PET BASICS BLOCK ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 38, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(pet.name, margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const speciesLabel = pet.species === 'dog' ? 'Pies' : pet.species === 'cat' ? 'Kot' : pet.species;
  const genderLabel = pet.gender === 'female' ? 'Samica' : 'Samiec';
  const neuteredLabel = pet.isNeutered ? 'Kastrowany/a: TAK' : 'Kastrowany/a: NIE';
  doc.text(`${speciesLabel} • ${pet.breed || 'Rasa nieokreslona'} • ${genderLabel} • ${neuteredLabel}`, margin + 6, y + 15);

  // Vital grid
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Wiek:', margin + 6, y + 23);
  doc.text('Waga aktualna:', margin + 48, y + 23);
  doc.text('Mikroczip:', margin + 98, y + 23);
  doc.text('Nr paszportu:', margin + 140, y + 23);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`${calculateAge(pet.birthDate)} (${pet.birthDate || '-'})`, margin + 6, y + 29);
  doc.text(`${pet.weightKg ? `${pet.weightKg} kg` : '-'}`, margin + 48, y + 29);
  doc.text(`${pet.chipNumber || 'Brak wpisu'}`, margin + 98, y + 29);
  doc.text(`${pet.passportNumber || 'Brak wpisu'}`, margin + 140, y + 29);

  y += 44;

  // --- ALLERGIES & WARNINGS BANNER ---
  if (pet.allergies || pet.specialNotes) {
    ensureSpace(24);
    doc.setFillColor(254, 242, 242); // Red-50
    doc.setDrawColor(248, 113, 113); // Red-400
    doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28);
    doc.text('! ALERGIE, REAKCJE NIEPOZADANE I SPECJALNE OSTRZEZENIA:', margin + 5, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(153, 27, 27);
    const alertText = [
      pet.allergies ? `Alergie: ${pet.allergies}` : null,
      pet.specialNotes ? `Uwagi: ${pet.specialNotes}` : null,
    ].filter(Boolean).join(' | ');

    doc.text(alertText || 'Brak znanych alergii', margin + 5, y + 13, { maxWidth: contentWidth - 10 });
    y += 24;
  }

  // --- VET CONTACT BLOCK ---
  if (pet.vetClinicName || pet.vetPhone || pet.emergencyClinicPhone) {
    ensureSpace(22);
    doc.setFillColor(240, 253, 250); // Teal-50
    doc.setDrawColor(94, 234, 212); // Teal-300
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 118, 110);
    doc.text('PROWADZACY GABINET WETERYNARYJNY I KONTAKT:', margin + 5, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(17, 94, 89);
    const clinic = pet.vetClinicName ? `Klinika: ${pet.vetClinicName}` : 'Klinika prowadzaca';
    const doctor = pet.vetDoctorName ? `Lekarz: ${pet.vetDoctorName}` : '';
    const phone = pet.vetPhone ? `Tel: ${pet.vetPhone}` : '';
    const emPhone = pet.emergencyClinicPhone ? `Dyżur 24h: ${pet.emergencyClinicPhone}` : '';
    const contactLine = [clinic, doctor, phone, emPhone].filter(Boolean).join(' | ');
    doc.text(contactLine, margin + 5, y + 12, { maxWidth: contentWidth - 10 });
    y += 22;
  }

  // Helper to render section title
  const renderSectionHeader = (title: string, count?: number) => {
    ensureSpace(12);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
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
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Brak stale przyjmowanych lekow zarejestrowanych w systemie.', margin + 3, y + 4);
    y += 8;
  } else {
    // Table header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Nazwa leku', margin + 3, y + 3);
    doc.text('Dawka i czestotliwosc', margin + 55, y + 3);
    doc.text('Zalecenia i podawanie', margin + 115, y + 3);
    y += 5;
    doc.line(margin, y, pageWidth - margin, y);
    y += 3;

    activeMeds.forEach(m => {
      ensureSpace(8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(m.name, margin + 3, y + 3);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const schedule = m.timesOfDay?.length 
        ? m.timesOfDay.map(t => `${t.label} ${t.time}`).join(', ')
        : (m.isChronic ? 'Lek stały' : 'Wg zaleceń');
      doc.text(`${m.dosage} (${schedule})`, margin + 55, y + 3, { maxWidth: 55 });
      doc.text(m.instructions || m.notes || '-', margin + 115, y + 3, { maxWidth: 65 });
      y += 6;
    });
    y += 4;
  }

  // --- VACCINATIONS TABLE ---
  renderSectionHeader('HISTORIA SZCZEPIEN', vaccinations.length);

  if (vaccinations.length === 0) {
    ensureSpace(8);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Brak wpisow dotyczacych szczepien.', margin + 3, y + 4);
    y += 8;
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Szczepienie / Choroba', margin + 3, y + 3);
    doc.text('Data podania', margin + 70, y + 3);
    doc.text('Wazne do', margin + 105, y + 3);
    doc.text('Nr serii / Weterynarz', margin + 140, y + 3);
    y += 5;
    doc.line(margin, y, pageWidth - margin, y);
    y += 3;

    vaccinations.forEach(v => {
      ensureSpace(8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(v.name, margin + 3, y + 3);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(v.dateAdministered || '-', margin + 70, y + 3);
      doc.text(v.validUntil || '-', margin + 105, y + 3);
      const vetInfo = [v.batchNumber, v.vetDoctor || v.vetClinic].filter(Boolean).join(' | ');
      doc.text(vetInfo || '-', margin + 140, y + 3, { maxWidth: 40 });
      y += 6;
    });
    y += 4;
  }

  // --- CONDITIONS & CHRONIC DISEASES ---
  if (conditions.length > 0) {
    renderSectionHeader('CHOROBY I ZDIAGNOZOWANE STANY PRZEWLEKLE', conditions.length);
    conditions.forEach(c => {
      ensureSpace(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`• ${c.name} (od: ${c.diagnosisDate || '-'})`, margin + 3, y + 3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Terapia: ${c.treatment || 'obserwacja'} | Status: ${c.status}`, margin + 6, y + 7);
      y += 10;
    });
    y += 3;
  }

  // --- RECENT MEDICAL EXAMS ---
  if (exams.length > 0) {
    renderSectionHeader('OSTATNIE BADANIA KLINICZNE I LABORATORYJNE', exams.length);
    exams.slice(0, 5).forEach(e => {
      ensureSpace(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`• ${e.title} (${e.date})`, margin + 3, y + 3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Wynik: ${e.summary || '-'}`, margin + 6, y + 7, { maxWidth: contentWidth - 10 });
      y += 10;
    });
    y += 3;
  }

  // --- VET VISITS HISTORY ---
  if (visits.length > 0) {
    renderSectionHeader('HISTORIA WIZYT WETERYNARYJNYCH', visits.length);
    visits.slice(0, 5).forEach(v => {
      ensureSpace(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`• ${v.date} - ${v.reason || 'Wizyta kontrolna'} (${v.clinic || 'Gabinet'})`, margin + 3, y + 3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const visitSummary = [v.diagnosis ? `Diagnoza: ${v.diagnosis}` : null, v.treatmentGiven ? `Zabieg/Leki: ${v.treatmentGiven}` : null, v.notes]
        .filter(Boolean)
        .join(' | ');
      doc.text(visitSummary || 'Wizyta zrealizowana', margin + 6, y + 7, { maxWidth: contentWidth - 10 });
      y += 10;
    });
    y += 3;
  }

  // --- FOOTER ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `PetCare • Elektroniczna Ksiazeczka Zdrowia • Strona ${p} z ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  return doc;
}

/**
 * Downloads the pet's medical report directly as a PDF file.
 */
export async function downloadPetMedicalReportPdf(data: ReportData): Promise<void> {
  const doc = buildPetMedicalReportPdf(data);
  const cleanName = (data.pet.name || 'pupil').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Karta_Zdrowia_${cleanName}.pdf`;

  // On Web / Android WebView
  doc.save(filename);
}

/**
 * Shares the generated PDF file via the native Android Share sheet (WhatsApp, Email, Drive).
 */
export async function sharePetMedicalReportPdf(data: ReportData): Promise<boolean> {
  try {
    const doc = buildPetMedicalReportPdf(data);
    const cleanName = (data.pet.name || 'pupil').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Karta_Zdrowia_${cleanName}.pdf`;

    const blob = doc.output('blob');
    const file = new File([blob], filename, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
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
