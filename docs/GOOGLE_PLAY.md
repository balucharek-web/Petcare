# Publikacja PetCare w Google Play

## 1. Pliki do wgrania

Każdy merge do `main` uruchamia workflow „Buduj plik APK na Androida”, który:
- podpisuje build kluczem z sekretów `ANDROID_KEYSTORE_*`;
- nadaje numer `versionCode = 100 + numer uruchomienia workflow`, więc każdy build ma większy numer, czego wymaga Google Play;
- ustawia `versionName` z pola `version` w `package.json`. Przed wydaniem nowej wersji podbij je, np. `2.62.0` → `2.63.0`;
- publikuje `PetCare.aab` (dla Google Play) i `PetCare.apk` (do instalacji ręcznej) w GitHub Releases.

Do Play Console wgrywasz **`PetCare.aab`**.

**Podpisywanie (Play App Signing):** przy pierwszym wydaniu wybierz „Use Google-generated key” i wgraj AAB podpisany obecnym kluczem. Ten klucz staje się wtedy *kluczem przesyłania* (upload key). Po włączeniu Play App Signing odciski SHA-1/SHA-256 *klucza aplikacji* znajdziesz w Play Console → Setup → App signing. Dodaj je w Google Cloud Console (OAuth client Android), inaczej logowanie Google w wersji ze sklepu nie zadziała.

## 2. Polityka prywatności

URL do wpisania w Play Console:
`https://petcare-558255772316.europe-west3.run.app/privacy.html`
(źródło: `PRIVACY_POLICY.md`. Po edycji uruchom `python3 scripts/build-privacy-html.py`, żeby odświeżyć `public/privacy.html`).

## 3. Usuwanie konta (wymagane przez Google Play)

- W aplikacji: Więcej → „Prywatność i Bezpieczeństwo (Google Play)” → „Usuń konto i dane”. Usuwa konto i wszystkie dane z serwera od razu.
- Poza aplikacją: prośba e-mailem na baluch.arek@gmail.com. Ten adres i URL polityki prywatności (sekcja 5) wpisz w polu „Delete account URL”.

## 4. Formularz Data Safety: odpowiedzi

**Czy aplikacja zbiera lub udostępnia dane użytkowników?** Tak.
**Czy wszystkie dane są szyfrowane podczas przesyłania?** Tak (HTTPS).
**Czy użytkownik może poprosić o usunięcie danych?** Tak.

| Kategoria Play | Typ danych | Zbierane | Udostępniane | Opcjonalne | Cel |
|---|---|---|---|---|---|
| Informacje osobiste | Adres e-mail | Tak | Nie | Tak (tylko konto synchronizacji) | Zarządzanie kontem, funkcje aplikacji |
| Informacje osobiste | Imię | Tak | Nie | Tak | Zarządzanie kontem |
| Zdjęcia i filmy | Zdjęcia | Tak | Nie* | Tak | Funkcje aplikacji (zdjęcie zwierzęcia w kopii, skan AI) |
| Lokalizacja | Przybliżona i dokładna | Tak | Nie* | Tak | Funkcje aplikacji (weterynarz w pobliżu) |
| Informacje o aplikacji i jej działaniu | Logi awarii, diagnostyka | Tak, tylko gdy ustawiony `SENTRY_DSN` | Nie* | Nie | Analityka/diagnostyka (naprawa błędów) |
| Pliki i dokumenty | Pliki | Tak (kopia danych aplikacji na serwerze) | Nie | Tak | Funkcje aplikacji, kopia zapasowa |

\* Według definicji Google Play przekazanie danych **dostawcy usługi przetwarzającemu je w imieniu aplikacji** (Google Cloud/Gemini, OpenStreetMap Nominatim, Sentry) nie jest „udostępnianiem”. Przetwarzanie lokalne na urządzeniu nie jest „zbieraniem”.

**Dane zdrowotne zwierząt** nie są danymi zdrowotnymi użytkownika w rozumieniu kategorii „Health and fitness”. Trafiają poza telefon tylko w kopii (wiersz „Pliki i dokumenty”).

Nie zaznaczaj: kontaktów, SMS, historii przeglądania, identyfikatorów reklamowych, danych finansowych, audio.

## 5. Uprawnienia: uzasadnienia

| Uprawnienie | Uzasadnienie |
|---|---|
| `CAMERA` | Zdjęcia zwierząt, skan dokumentów i kodów QR |
| `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION` | Wyszukiwanie weterynarzy w pobliżu, tylko na żądanie (bez lokalizacji w tle) |
| `POST_NOTIFICATIONS` | Przypomnienia o lekach, szczepieniach i wizytach |
| `SCHEDULE_EXACT_ALARM` | Przypomnienia o podaniu leku o konkretnej godzinie. Użytkownik może odmówić w ustawieniach systemu, wtedy przypomnienia mogą przychodzić z opóźnieniem |
| `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`, `VIBRATE` | Przywrócenie przypomnień po restarcie telefonu |
| `INTERNET` | Kopia, synchronizacja, AI, mapy |

## 6. Inne sekcje Play Console

- **Kategoria:** Styl życia (alternatywnie Medycyna). **Reklamy:** nie. **Grupa docelowa:** 18+ (lub 13+).
- **Dostęp do aplikacji:** wszystkie funkcje działają bez logowania. Do testów synchronizacji wystarczy założyć konto w aplikacji.
- **Deklaracja zdrowotna (Health apps):** aplikacja dotyczy zdrowia zwierząt i nie jest wyrobem medycznym.
