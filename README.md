# 🐾 PetCare - Asystent Opiekuna Zwierzaka

Inteligentny, mobilny dziennik zdrowia i leczenia dla psów, kotów i innych zwierząt domowych.

## ✨ Funkcje
- 💊 **Leki i Dawkowanie**: Harmonogram leków, automatyczny kalkulator dawek na kg masy ciała.
- 💉 **Szczepienia**: Rejestr szczepień z datami ważności i powiadomieniami.
- 🔬 **Badania i Wyniki**: Przechowywanie wyników krwi, USG, RTG ze zdjęciami/skanami.
- 🩺 **Choroby i Wizyty**: Historia leczenia, diagnozy i notatki z wizyt u weterynarza.
- 🆘 **Tryb Awaryjny (SOS)**: Natychmiastowy dostęp do kluczowych danych zwierzaka w nagłych wypadkach.
- 📱 **Aplikacja Android / PWA**: Działa w 100% offline, zoptymalizowana na telefony.

## 📱 Automatyczne budowanie pliku APK na Androida
W repozytorium skonfigurowany jest **GitHub Actions** (`.github/workflows/build-apk.yml`).
Przy każdym commicie (lub ręcznie w zakładce **Actions**) GitHub automatycznie kompiluje plik **`PetCare-App-debug.apk`**, który można pobrać w sekcji **Artifacts**.
