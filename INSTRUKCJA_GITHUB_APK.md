# Jak wygenerować plik APK na Androida za pomocą GitHub Actions

W repozytorium znajduje się już skonfigurowany plik automatyzacji:  
`.github/workflows/build-apk.yml`

Dzięki temu **GitHub całkowicie za darmo** skompiluje aplikację i wygeneruje gotowy plik `.apk` do zainstalowania na telefonie!

---

### Instrukcja krok po kroku:

1. **Wgraj projekt do nowego repozytorium na GitHubie** (np. `petcare`).
2. Wejdź na stronę swojego repozytorium na GitHub.
3. Przejdź do zakładki **Actions** (u góry obok Code, Issues, Pull requests).
4. Po lewej stronie zobaczysz workflow: **"Buduj plik APK na Androida"**.
   - Jeśli workflow uruchomił się automatycznie po wysłaniu kodu (`push`), poczekaj około 2-3 minuty na zielony znacznik ✅.
   - Możesz go też wywołać w dowolnej chwili: kliknij nazwę workflow ➔ przycisk **"Run workflow"** ➔ **Run workflow**.
5. Kliknij w zakończone pomyślnie zadanie (zielony "check").
6. Na dole strony w sekcji **Artifacts** znajdziesz plik do pobrania:
   - **`PetCare-App-debug.apk`**
7. Pobierz archiwum zip, rozpakuj plik `.apk` i prześlij go na telefon (lub pobierz bezpośrednio z przeglądarki w telefonie), a następnie zainstaluj!
