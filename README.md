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

## 🔐 Podpisywanie wydań (GitHub Secrets)
Klucz podpisujący **nie jest przechowywany w repozytorium**. Aby workflow zbudował podpisane APK/AAB i opublikował wydanie, ustaw w **Settings → Secrets and variables → Actions**:

| Sekret | Opis |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | plik keystore zakodowany w base64 (`base64 -w0 release.keystore`) |
| `ANDROID_KEYSTORE_PASSWORD` | hasło keystore |
| `ANDROID_KEY_ALIAS` | alias klucza (domyślnie `petcare`) |
| `ANDROID_KEY_PASSWORD` | hasło klucza (domyślnie takie jak keystore) |

Bez tych sekretów workflow buduje tylko `PetCare-debug.apk` (Artifacts) i nie publikuje wydania. Tag wydania jest brany z `version` w `package.json`.

## ☁️ Serwer (Cloud Run + Firestore)
Backend (`server.ts`) działa na Cloud Run w projekcie `gen-lang-client-0912555946` (`europe-west3`) pod adresem `https://petcare-558255772316.europe-west3.run.app`. Dane synchronizacji i transfery QR są w Firestore (`syncStore.ts`); lokalnie, bez `SYNC_STORE=firestore`, zapisywane są w `data/cloud_sync_db.json`.

- Jednorazowa konfiguracja Google Cloud (w Cloud Shell): `bash <(curl -fsSL https://raw.githubusercontent.com/balucharek-web/Petcare/main/scripts/setup-gcp.sh)`
- Następnie ustaw zmienną repozytorium `GCP_DEPLOY_ENABLED=true` (Settings → Secrets and variables → Actions → Variables).
- Każdy push do `main` wdraża serwer przez `.github/workflows/deploy-cloud-run.yml` (logowanie do GCP przez Workload Identity Federation, bez kluczy w repo). Klucz Gemini jest w Secret Manager jako `gemini-api-key`.
- Aplikacja web/APK łączy się z adresem z `VITE_APP_URL` (domyślnie powyższy adres Cloud Run).
