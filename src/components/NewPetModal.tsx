import React, { useState } from 'react';
import { Camera, Plus, X, Heart, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Pet, Species, Gender } from '../types/pet';
import { compressImage } from '../utils/imageCompressor';
import { SamplePhotoPickerModal } from './SamplePhotoPickerModal';
import { getDefaultPhotoForSpecies } from '../data/samplePetPhotos';

interface NewPetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPet: (pet: Pet) => void;
}

export const NewPetModal: React.FC<NewPetModalProps> = ({
  isOpen,
  onClose,
  onAddPet,
}) => {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<Species>('dog');
  const [breed, setBreed] = useState('');
  const [gender, setGender] = useState<Gender>('female');
  const [birthDate, setBirthDate] = useState('2023-01-01');
  const [weightKg, setWeightKg] = useState('10');
  const [chipNumber, setChipNumber] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [color, setColor] = useState('');
  const [isNeutered, setIsNeutered] = useState(false);
  const [allergies, setAllergies] = useState('');
  const [vetClinicName, setVetClinicName] = useState('');
  const [vetDoctorName, setVetDoctorName] = useState('');
  const [vetPhone, setVetPhone] = useState('');
  const [emergencyClinicPhone, setEmergencyClinicPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState(() => getDefaultPhotoForSpecies('dog'));
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  const [hasCustomPhoto, setHasCustomPhoto] = useState(false);

  if (!isOpen) return null;

  const [isCompressing, setIsCompressing] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsCompressing(true);
      const res = await compressImage(file, { maxWidth: 1000, maxHeight: 1000, quality: 0.82 });
      setPhotoUrl(res.dataUrl);
      setHasCustomPhoto(true);
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        if (url) {
          setPhotoUrl(url);
          setHasCustomPhoto(true);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSpeciesChange = (newSpecies: Species) => {
    setSpecies(newSpecies);
    if (!hasCustomPhoto) {
      setPhotoUrl(getDefaultPhotoForSpecies(newSpecies));
    }
  };

  const handleSelectSamplePhoto = (url: string) => {
    setPhotoUrl(url);
    setHasCustomPhoto(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newWeight = parseFloat(weightKg) || 1;
    const newPet: Pet = {
      id: `pet-${Date.now()}`,
      name: name.trim(),
      species,
      breed: breed.trim() || 'Mieszaniec',
      gender,
      birthDate,
      weightKg: newWeight,
      chipNumber: chipNumber.trim(),
      passportNumber: passportNumber.trim() || undefined,
      color: color.trim() || 'Nie określono',
      isNeutered,
      photoUrl,
      allergies: allergies.trim() || undefined,
      vetClinicName: vetClinicName.trim() || undefined,
      vetDoctorName: vetDoctorName.trim() || undefined,
      vetPhone: vetPhone.trim() || undefined,
      emergencyClinicPhone: emergencyClinicPhone.trim() || undefined,
      weightHistory: [
        {
          id: `w-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          weightKg: newWeight,
          notes: 'Waga początkowa',
        }
      ],
      createdAt: new Date().toISOString(),
    };

    onAddPet(newPet);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
        <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Heart className="w-5 h-5 text-teal-600" />
              Dodaj nowego zwierzaka
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Photo & Name */}
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <img
                    src={photoUrl}
                    alt="Podgląd"
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-teal-500 shadow-sm"
                  />
                  <label className="absolute -bottom-1 -right-1 p-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow cursor-pointer">
                    <Camera className="w-3.5 h-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="flex-1 space-y-1">
                  <label className="font-semibold text-slate-700 block">Imię pupila *</label>
                  <input
                    type="text"
                    required
                    placeholder="np. Borys, Bella, Puszek"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-teal-600"
                  />
                </div>
              </div>

              {/* Sample Photo & Upload Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsPhotoPickerOpen(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold rounded-xl text-[11px] transition-colors border border-teal-200"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Wybierz przykładowe zdjęcie</span>
                </button>
                <label className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-[11px] transition-colors cursor-pointer border border-slate-200">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Z aparatu / pliku</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Gatunek</label>
                <select
                  value={species}
                  onChange={(e) => handleSpeciesChange(e.target.value as Species)}
                  className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium"
                >
                  <option value="dog">Pies</option>
                  <option value="cat">Kot</option>
                  <option value="rabbit">Królik</option>
                  <option value="ferret">Fretka</option>
                  <option value="bird">Ptak</option>
                  <option value="other">Inny</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Płeć</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              >
                <option value="female">Samica</option>
                <option value="male">Samiec</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Kastracja</label>
              <select
                value={isNeutered ? 'yes' : 'no'}
                onChange={(e) => setIsNeutered(e.target.value === 'yes')}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              >
                <option value="no">Nie</option>
                <option value="yes">Tak</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Rasa</label>
              <input
                type="text"
                placeholder="np. Kundelek, Owczarek"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Data urodzenia</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Waga (kg)</label>
              <input
                type="number"
                step="0.1"
                placeholder="np. 12.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Umaszczenie</label>
              <input
                type="text"
                placeholder="np. Rudy, łaciaty"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Numer Mikroczipa *</label>
            <input
              type="text"
              placeholder="15 cyfr mikroczipa (np. 616093900...)"
              value={chipNumber}
              onChange={(e) => setChipNumber(e.target.value)}
              className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Klinika weterynaryjna</label>
              <input
                type="text"
                placeholder="Nazwa przychodni"
                value={vetClinicName}
                onChange={(e) => setVetClinicName(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Telefon do weterynarza</label>
              <input
                type="tel"
                placeholder="np. +48 600..."
                value={vetPhone}
                onChange={(e) => setVetPhone(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow"
            >
              Dodaj pupila
            </button>
          </div>
        </form>
      </div>
    </div>

    <SamplePhotoPickerModal
      isOpen={isPhotoPickerOpen}
      onClose={() => setIsPhotoPickerOpen(false)}
      onSelectPhoto={handleSelectSamplePhoto}
      initialSpecies={species}
      currentPhotoUrl={photoUrl}
    />
  </>
  );
};

