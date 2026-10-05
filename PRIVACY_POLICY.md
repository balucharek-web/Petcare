# Polityka prywatności aplikacji PetCare

**Ostatnia aktualizacja:** 4 października 2026 r.

**Administrator danych:** Arkadiusz Baluch, e-mail: baluch.arek@gmail.com

Ta polityka opisuje, jakie dane przetwarza aplikacja PetCare (Android i wersja webowa), w jakim celu, gdzie są przechowywane i jak je usunąć.

## 1. Dane przechowywane w telefonie

Dane, które wpisujesz, zapisują się domyślnie tylko w pamięci urządzenia (IndexedDB lub localStorage). Są to:

- profile zwierząt: imię, gatunek, rasa, data urodzenia, waga, zdjęcie, numer chipa;
- dane zdrowotne zwierząt: szczepienia, leki i historia podanych dawek, wizyty, badania, choroby, notatki, wydatki;
- ustawienia aplikacji i przypomnień.

Te dane nie opuszczają telefonu, dopóki sam nie włączysz jednej z funkcji opisanych niżej.

## 2. Funkcje, które wysyłają dane poza telefon (opcjonalne)

### 2.1. Kopia na Dysku Google
Kopia trafia na Twoje własne konto Google, do folderu `petcare_kopiazapasowa`. Aplikacja ma uprawnienie `drive.file`, czyli dostęp tylko do plików, które sama utworzyła. Logowanie odbywa się przez Google (Firebase Authentication). Nie mamy dostępu do Twojego Dysku.

### 2.2. Konto synchronizacji PetCare
Synchronizacja między urządzeniami i przenoszenie danych kodem PIN lub QR wymagają konta (e-mail i hasło albo logowanie Google). Na serwerze PetCare zapisujemy:

- adres e-mail, imię (jeśli je podasz) i datę założenia konta;
- skrót (hash PBKDF2) hasła. Samego hasła nie przechowujemy;
- skróty tokenów sesji (tylko skrót SHA-256, maksymalnie 10 urządzeń, ważność 60 dni);
- kopię danych aplikacji z punktu 1, skompresowaną;
- tymczasowe kody parowania i transferu QR, ważne do 15 minut.

Serwer działa w Google Cloud (Cloud Run i Firestore) w regionie europe-west3 (Frankfurt, UE). Połączenia są szyfrowane (HTTPS/TLS).

### 2.3. Analiza AI (skaner dokumentów, analiza karmy)
Zrobione przez Ciebie zdjęcie dokumentu weterynaryjnego, opakowania leku lub etykiety karmy, razem z imieniem i gatunkiem zwierzęcia, wysyłamy przez serwer PetCare do usługi Google Gemini API. Serwer nie zapisuje zdjęć: przetwarza je tylko na czas analizy, a wynik wraca do telefonu. Google przetwarza te dane zgodnie z warunkami Gemini API (https://ai.google.dev/gemini-api/terms). Przy bezpłatnym poziomie usługi Google może wykorzystywać przesłane treści do ulepszania swoich usług. Nie wysyłaj zdjęć zawierających dane osobowe, których nie chcesz udostępniać.

### 2.4. Wyszukiwanie weterynarzy w pobliżu
Po wybraniu tej funkcji przybliżona lub dokładna lokalizacja, na którą zgodziłeś się w telefonie, albo wpisany adres trafia do usługi OpenStreetMap Nominatim, bezpośrednio lub przez serwer PetCare. Usługa zwraca listę pobliskich gabinetów. Lokalizacji nie zapisujemy i nie śledzimy. Linki „Nawiguj” otwierają Mapy Google.

### 2.5. Raporty błędów (jeśli są włączone)
Jeżeli w danej wersji aplikacji włączono raportowanie błędów (Sentry), po awarii wysyłamy techniczny opis błędu: komunikat, ślad stosu, wersję aplikacji, model i system urządzenia. Przed wysłaniem raport jest czyszczony z adresów e-mail, tokenów, haseł i zdjęć. Nie zawiera danych zdrowotnych zwierząt. Celem jest wyłącznie naprawianie błędów.

### 2.6. Obrazy z zewnętrznych serwisów
Przykładowe zdjęcia zwierząt pochodzą z Unsplash. Awatary z inicjałami może generować serwis ui-avatars.com, który dostaje wtedy inicjały lub imię. Te serwisy widzą adres IP urządzenia, tak jak każda strona internetowa.

## 3. Uprawnienia Androida

- **Aparat:** zdjęcia zwierząt i skanowanie dokumentów oraz kodów QR. Tylko po Twoim działaniu.
- **Lokalizacja:** wyszukiwanie weterynarzy w pobliżu. Tylko na żądanie.
- **Powiadomienia, dokładne alarmy, autostart:** przypomnienia o lekach, szczepieniach i wizytach, także po ponownym uruchomieniu telefonu.
- **Internet:** kopia, synchronizacja, AI i mapy.

## 4. Czego nie robimy

- Nie sprzedajemy danych i nie udostępniamy ich reklamodawcom.
- Nie wyświetlamy reklam i nie używamy narzędzi do śledzenia ani profilowania.
- Nie zbieramy danych kontaktów, SMS-ów, plików spoza aplikacji ani historii przeglądania.

## 5. Okres przechowywania i usuwanie danych

- Dane w telefonie usuniesz w ustawieniach aplikacji albo odinstalowując aplikację.
- **Konto synchronizacji i wszystkie dane na serwerze** usuniesz w aplikacji: Więcej, potem „Prywatność i Bezpieczeństwo (Google Play)”, potem „Usuń konto i dane”. Możesz też wysłać prośbę na baluch.arek@gmail.com, a konto usuniemy w ciągu 30 dni. Usunięcie w aplikacji działa od razu i jest nieodwracalne.
- Kopię na Dysku Google usuniesz w aplikacji albo bezpośrednio na Dysku (folder `petcare_kopiazapasowa`).
- Kody PIN i QR wygasają same po 15 minutach, a sesje logowania po 60 dniach.

## 6. Twoje prawa (RODO)

Masz prawo do dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia danych (eksport do pliku JSON jest dostępny w aplikacji) i sprzeciwu. Możesz też złożyć skargę do Prezesa Urzędu Ochrony Danych Osobowych. Podstawą przetwarzania jest wykonanie usługi, o którą prosisz (art. 6 ust. 1 lit. b RODO), a w przypadku raportów błędów prawnie uzasadniony interes, czyli zapewnienie działania aplikacji (art. 6 ust. 1 lit. f).

## 7. Dzieci

Aplikacja nie jest skierowana do dzieci poniżej 13 lat i nie zbiera świadomie ich danych.

## 8. Zmiany polityki

O istotnych zmianach poinformujemy w aplikacji. Aktualna wersja jest dostępna pod adresem https://petcare-558255772316.europe-west3.run.app/privacy.html oraz w repozytorium projektu.

## 9. Kontakt

E-mail: baluch.arek@gmail.com
Projekt: https://github.com/balucharek-web/Petcare
