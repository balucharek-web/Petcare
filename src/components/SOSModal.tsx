import React, { useState } from 'react';
import { X, Phone, AlertOctagon, Copy, Check, ShieldAlert, Heart, Syringe } from 'lucide-react';
import { Pet } from '../types/pet';

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
  onOpenEmergencyVetFinder?: () => void;
}

export const SOSModal: React.FC<SOSModalProps> = ({ isOpen, onClose, pet, onOpenEmergencyVetFinder }) => {
  const [copiedChip, setCopiedChip] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChip(true);
    setTimeout(() => setCopiedChip(false), 2000);
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-rose-100 flex flex-col max-h-[90vh]">
        {/* Urgent Header */}
        <div className="bg-gradient-to-r from-rose-600 to-red-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Karta Ratunkowa SOS</h2>
              <p className="text-xs text-rose-100">Pilne dane medyczne i kontakt weterynaryjny</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-white" aria-label="Zamknij">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Pet Basic Banner */}
          <div className="flex items-center gap-4 bg-rose-50/60 p-4 rounded-2xl border border-rose-100">
            <img
              src={pet.photoUrl || 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=300&q=80'}
              alt={pet.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-rose-300 shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-lg text-slate-900 truncate">{pet.name}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">
                  {pet.species === 'dog' ? 'Pies' : pet.species === 'cat' ? 'Kot' : 'Zwierzak'}
                </span>
              </div>
              <p className="text-xs text-slate-600">{pet.breed || 'Mieszaniec'} • {pet.weightKg} kg</p>
              {pet.bloodType && (
                <p className="text-xs font-medium text-rose-700 mt-0.5">Grupa krwi: {pet.bloodType}</p>
              )}
            </div>
          </div>

          {/* Microchip highlight */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Numer Mikroczipa</span>
                <p className="font-mono text-base font-bold text-slate-800 tracking-wider">
                  {pet.chipNumber || 'Brak wpisanego chipa'}
                </p>
              </div>
              {pet.chipNumber && (
                <button
                  onClick={() => copyToClipboard(pet.chipNumber)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    copiedChip ? 'bg-emerald-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  {copiedChip ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedChip ? 'Skopiowano' : 'Kopiuj'}
                </button>
              )}
            </div>
            {pet.passportNumber && (
              <p className="text-xs text-slate-500 mt-2">
                Paszport: <span className="font-medium text-slate-700">{pet.passportNumber}</span>
              </p>
            )}
          </div>

          {/* Allergies & Crucial Alerts */}
          {pet.allergies && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start">
              <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">Uczulenia i Alergie</h4>
                <p className="text-sm font-semibold text-amber-900 mt-0.5">{pet.allergies}</p>
              </div>
            </div>
          )}

          {pet.specialNotes && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800">Ważne uwagi behawioralne / zdrowotne</h4>
              <p className="text-xs text-blue-900 mt-1 leading-relaxed">{pet.specialNotes}</p>
            </div>
          )}

          {/* Emergency Call & 24h Finder Buttons */}
          <div className="space-y-3 pt-2">
            {onOpenEmergencyVetFinder && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEmergencyVetFinder();
                }}
                className="flex items-center justify-center gap-2.5 w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white font-extrabold rounded-2xl shadow-lg shadow-rose-600/30 active:scale-[0.98] transition cursor-pointer text-sm"
              >
                <ShieldAlert className="w-5 h-5 text-amber-300 animate-pulse shrink-0" />
                <span>🚨 Znajdź dyżur weterynaryjny 24h w okolicy</span>
              </button>
            )}

            {pet.emergencyClinicPhone && (
              <a
                href={`tel:${pet.emergencyClinicPhone}`}
                className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow active:scale-[0.98] transition text-xs"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Zadzwoń: Mój Dyżur Całodobowy ({pet.emergencyClinicPhone})</span>
              </a>
            )}

            {pet.vetPhone && (
              <a
                href={`tel:${pet.vetPhone}`}
                className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-2xl border border-slate-200 shadow-xs active:scale-[0.98] transition text-xs"
              >
                <Phone className="w-4 h-4 text-teal-600" />
                <span>Lekarz Prowadzący: {pet.vetDoctorName || 'Weterynarz'} ({pet.vetPhone})</span>
              </a>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition text-sm"
          >
            Zamknij kartę ratunkową
          </button>
        </div>
      </div>
    </div>
  );
};
