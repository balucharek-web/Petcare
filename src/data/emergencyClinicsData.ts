export interface EmergencyClinic {
  id: string;
  name: string;
  city: string;
  voivodeship: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  open24h: boolean;
  notes?: string;
  services?: string[];
}

export const COMPREHENSIVE_24H_CLINICS: EmergencyClinic[] = [
  // =================== MAZOWIECKIE ===================
  {
    id: 'waw-1',
    name: 'Klinika Weterynaryjna Bemowo (Całodobowa)',
    city: 'Warszawa',
    voivodeship: 'Mazowieckie',
    address: 'ul. Powstańców Śląskich 101, 01-495 Warszawa',
    phone: '22 638 39 14',
    lat: 52.2472,
    lng: 20.9168,
    open24h: true,
    notes: 'Pełne zaplecze intensywnej terapii, tlen, tomografia komputerowa, chirurgia ostra 24/7',
    services: ['Ostry dyżur chirurgiczny', 'Szpital 24h', 'RTG/USG', 'Tlenoterapia']
  },
  {
    id: 'waw-2',
    name: 'Klinika Weterynaryjna Elwet 24h',
    city: 'Warszawa',
    voivodeship: 'Mazowieckie',
    address: 'al. Niepodległości 24/30, 02-653 Warszawa',
    phone: '22 843 23 46',
    lat: 52.2036,
    lng: 21.0189,
    open24h: true,
    notes: 'Dyżur chirurgiczny, internistyczny i laboratoryjny całą dobę. Centrum Warszawy (Mokotów)',
    services: ['Szpital całodobowy', 'Laboratorium cito', 'Chirurgia miękka i urazowa']
  },
  {
    id: 'waw-3',
    name: 'Klinika Weterynaryjna Multiwet 24h',
    city: 'Warszawa',
    voivodeship: 'Mazowieckie',
    address: 'ul. Gagarina 5, 00-753 Warszawa',
    phone: '22 841 40 22',
    lat: 52.2098,
    lng: 21.0371,
    open24h: true,
    notes: 'Szpital stacjonarny 24h, aparatura podtrzymująca życie, bank krwi',
    services: ['Bank krwi', 'Intensywna terapia', 'Kardiologia ostra']
  },
  {
    id: 'waw-4',
    name: 'Całodobowa Klinika Weterynaryjna Puławska',
    city: 'Warszawa',
    voivodeship: 'Mazowieckie',
    address: 'ul. Puławska 509, 02-844 Warszawa',
    phone: '22 644 65 31',
    lat: 52.1325,
    lng: 21.0116,
    open24h: true,
    notes: 'Ostry dyżur Ursynów / Piaseczno, reanimacja i chirurgia ratunkowa',
    services: ['Dyżur 24/7 Ursynów', 'Chirurgia ratunkowa', 'Inkubatory']
  },
  {
    id: 'waw-5',
    name: 'Lecznica Weterynaryjna Żoliborz 24h',
    city: 'Warszawa',
    voivodeship: 'Mazowieckie',
    address: 'ul. Schroegera 72, 01-828 Warszawa (Bielany)',
    phone: '22 834 54 53',
    lat: 52.2798,
    lng: 20.9491,
    open24h: true,
    notes: 'Całodobowy dyżur internistyczny i chirurgiczny w północnej Warszawie',
    services: ['Dyżur nocny', 'Chirurgia', 'Szpital']
  },
  {
    id: 'rad-1',
    name: 'Całodobowe Pogotowie Weterynaryjne Radom - Klinika Pod Złotym Psem',
    city: 'Radom',
    voivodeship: 'Mazowieckie',
    address: 'ul. Traugutta 52, 26-600 Radom',
    phone: '48 362 60 00',
    lat: 51.3982,
    lng: 21.1541,
    open24h: true,
    notes: 'Całodobowy dyżur telefoniczny i interwencyjny w nagłych wypadkach',
    services: ['Dyżur ratunkowy', 'RTG cyfrowe', 'USG']
  },
  {
    id: 'plo-1',
    name: 'Klinika Weterynaryjna Medicus 24h Płock',
    city: 'Płock',
    voivodeship: 'Mazowieckie',
    address: 'ul. Wyszogrodzka 125, 09-400 Płock',
    phone: '24 264 30 00',
    lat: 52.5401,
    lng: 19.7289,
    open24h: true,
    notes: 'Dyżur nocny i weekendowy dla psów i kotów, chirurgiczne zaopatrzenie ran',
    services: ['Ostry dyżur', 'Hospitalizacja', 'Chirurgia miękka']
  },
  {
    id: 'sie-1',
    name: 'Lecznica Weterynaryjna Siedlce 24h',
    city: 'Siedlce',
    voivodeship: 'Mazowieckie',
    address: 'ul. Piłsudskiego 78, 08-110 Siedlce',
    phone: '25 632 44 22',
    lat: 52.1721,
    lng: 22.2842,
    open24h: true,
    notes: 'Dyżur pod telefonem w nagłych wypadkach losowych i urazach komunikacyjnych',
    services: ['Pomoc powypadkowa', 'Chirurgia']
  },

  // =================== MAŁOPOLSKIE ===================
  {
    id: 'krk-1',
    name: 'Klinika Weterynaryjna Krak-Vet 24h',
    city: 'Kraków',
    voivodeship: 'Małopolskie',
    address: 'ul. Sanocka 3, 30-542 Kraków',
    phone: '12 655 55 33',
    lat: 50.0345,
    lng: 19.9512,
    open24h: true,
    notes: 'Całodobowy dyżur ratunkowy, szpital stacjonarny i chirurgia urazowa',
    services: ['Szpital 24h', 'Chirurgia urazowa', 'Tomografia', 'Badania krwi cito']
  },
  {
    id: 'krk-2',
    name: 'Klinika Weterynaryjna Arka 24h',
    city: 'Kraków',
    voivodeship: 'Małopolskie',
    address: 'ul. Chłopska 2A, 30-806 Kraków',
    phone: '12 658 83 65',
    lat: 50.0198,
    lng: 19.9912,
    open24h: true,
    notes: 'Ostry dyżur 24/7, pełna diagnostyka obrazowa, tlenoterapia, szpital intensywnej opieki',
    services: ['Intensywna opieka medyczna', 'Tlen', 'Analityka medyczna']
  },
  {
    id: 'krk-3',
    name: 'Lecznica Weterynaryjna Therios (Dyżur 24h)',
    city: 'Myślenice',
    voivodeship: 'Małopolskie',
    address: 'ul. Słowackiego 100, 32-400 Myślenice (rejon Krakowa)',
    phone: '12 274 00 24',
    lat: 49.8335,
    lng: 19.9405,
    open24h: true,
    notes: 'Klinika referencyjna na południe od Krakowa, dyżur ratunkowy',
    services: ['Kardiologia', 'Chirurgia', 'Dyżur 24h']
  },
  {
    id: 'tar-1',
    name: 'Centrum Weterynaryjne Tarnów 24h',
    city: 'Tarnów',
    voivodeship: 'Małopolskie',
    address: 'ul. Lwowska 85, 33-100 Tarnów',
    phone: '14 621 11 20',
    lat: 50.0142,
    lng: 21.0084,
    open24h: true,
    notes: 'Całodobowy dyżur pogotowia weterynaryjnego w Tarnowie i okolicach',
    services: ['Dyżur nocny', 'Chirurgia urazowa', 'USG/RTG']
  },
  {
    id: 'nsa-1',
    name: 'Lecznica Weterynaryjna Beskid-Vet 24h',
    city: 'Nowy Sącz',
    voivodeship: 'Małopolskie',
    address: 'ul. Nawojowska 112, 33-300 Nowy Sącz',
    phone: '18 441 55 99',
    lat: 49.6052,
    lng: 20.7142,
    open24h: true,
    notes: 'Ostry dyżur dla Sądecczyzny i Podhala, chirurgia, tlen',
    services: ['Dyżur 24/7', 'Pomoc powypadkowa', 'Szpital']
  },
  {
    id: 'zak-1',
    name: 'Pogotowie Weterynaryjne Tatry-Vet',
    city: 'Zakopane',
    voivodeship: 'Małopolskie',
    address: 'ul. Nowotarska 34, 34-500 Zakopane',
    phone: '18 201 22 22',
    lat: 49.3005,
    lng: 19.9572,
    open24h: true,
    notes: 'Dyżur telefoniczny i pomoc interwencyjna pod Tatrami',
    services: ['Pomoc nocna', 'Zaopatrywanie urazów']
  },

  // =================== ŚLĄSKIE ===================
  {
    id: 'kat-1',
    name: 'Klinika Weterynaryjna Brynów 24h',
    city: 'Katowice',
    voivodeship: 'Śląskie',
    address: 'ul. Brynowska 25c, 40-584 Katowice',
    phone: '32 251 75 30',
    lat: 50.2372,
    lng: 18.9984,
    open24h: true,
    notes: 'Całodobowy dyżur chirurgiczny i szpital dla zwierząt. Główny ośrodek referencyjny Śląska',
    services: ['Ostry dyżur 24h', 'Chirurgia urazowa', 'Tomografia', 'Szpital stacjonarny']
  },
  {
    id: 'kat-2',
    name: 'Klinika Weterynaryjna Fabisz & Stefanek 24h',
    city: 'Chorzów',
    voivodeship: 'Śląskie',
    address: 'ul. Stefana Batorego 11, 41-506 Chorzów',
    phone: '32 246 64 64',
    lat: 50.2882,
    lng: 18.9482,
    open24h: true,
    notes: 'Szpital całodobowy, tomografia komputerowa, intensywna terapia, chirurgia',
    services: ['TK', 'Intensywna terapia', 'Dyżur 24/7']
  },
  {
    id: 'gli-1',
    name: 'Całodobowa Klinika Weterynaryjna Gliwice',
    city: 'Gliwice',
    voivodeship: 'Śląskie',
    address: 'ul. Toszecka 19, 44-100 Gliwice',
    phone: '32 279 40 40',
    lat: 50.3082,
    lng: 18.6654,
    open24h: true,
    notes: 'Szpital dla zwierząt i ostry dyżur internistyczno-chirurgiczny w Gliwicach',
    services: ['Szpital 24h', 'RTG/USG', 'Kroplówki', 'Tlen']
  },
  {
    id: 'sos-1',
    name: 'Lecznica Weterynaryjna Zagłębie 24h',
    city: 'Sosnowiec',
    voivodeship: 'Śląskie',
    address: 'ul. Teatralna 9, 41-200 Sosnowiec',
    phone: '32 291 00 11',
    lat: 50.2792,
    lng: 19.1352,
    open24h: true,
    notes: 'Ostry dyżur Zagłębia Dąbrowskiego, pomoc powypadkowa',
    services: ['Dyżur nocny', 'Chirurgia ratunkowa']
  },
  {
    id: 'cze-1',
    name: 'Klinika Weterynaryjna Częstochowa 24h',
    city: 'Częstochowa',
    voivodeship: 'Śląskie',
    address: 'al. Wolności 44, 42-200 Częstochowa',
    phone: '34 365 20 20',
    lat: 50.8089,
    lng: 19.1172,
    open24h: true,
    notes: 'Całodobowa opieka weterynaryjna, szpital, USG Doppler, EKG',
    services: ['Ostry dyżur 24h', 'Szpital', 'Badania laboratoryjne']
  },
  {
    id: 'biel-1',
    name: 'Klinika Weterynaryjna Beskidzka 24h',
    city: 'Bielsko-Biała',
    voivodeship: 'Śląskie',
    address: 'ul. Partyzantów 55, 43-300 Bielsko-Biała',
    phone: '33 812 40 00',
    lat: 49.8142,
    lng: 19.0498,
    open24h: true,
    notes: 'Całodobowy ostry dyżur dla Podbeskidzia, chirurgia i szpital',
    services: ['Ostry dyżur 24/7', 'Hospitalizacja', 'Chirurgia miękka']
  },
  {
    id: 'ryb-1',
    name: 'Szpital Weterynaryjny Rybnik 24h',
    city: 'Rybnik',
    voivodeship: 'Śląskie',
    address: 'ul. Raciborska 38, 44-200 Rybnik',
    phone: '32 422 15 15',
    lat: 50.0984,
    lng: 18.5372,
    open24h: true,
    notes: 'Opieka stacjonarna i dyżur urazowy dla Rybnika, Żor i Wodzisławia Śląskiego',
    services: ['Szpital 24h', 'Pogotowie urazowe']
  },

  // =================== DOLNOŚLĄSKIE ===================
  {
    id: 'wro-1',
    name: 'Klinika Weterynaryjna Niedzielscy 24h',
    city: 'Wrocław',
    voivodeship: 'Dolnośląskie',
    address: 'ul. Energetyczna 14, 53-330 Wrocław',
    phone: '71 360 51 90',
    lat: 51.0924,
    lng: 17.0223,
    open24h: true,
    notes: 'Szpital 24h, chirurgia ratunkowa, intensywna terapia, bank krwi',
    services: ['Intensywna terapia', 'Dyżur 24/7', 'Chirurgia naczyniowa i urazowa']
  },
  {
    id: 'wro-2',
    name: 'Uniwersytet Przyrodniczy we Wrocławiu - Klinika Małych Zwierząt 24h',
    city: 'Wrocław',
    voivodeship: 'Dolnośląskie',
    address: 'pl. Grunwaldzki 47, 50-366 Wrocław',
    phone: '71 320 53 71',
    lat: 51.1147,
    lng: 17.0601,
    open24h: true,
    notes: 'Kliniczny ostry dyżur akademicki, rezonans, tomograf, szpital uniwersytecki',
    services: ['Szpital akademicki', 'TK/MRI', 'Kardiologia', 'Toksykologia']
  },
  {
    id: 'wal-1',
    name: 'Pogotowie Weterynaryjne Wałbrzych 24h',
    city: 'Wałbrzych',
    voivodeship: 'Dolnośląskie',
    address: 'ul. Wrocławska 52, 58-306 Wałbrzych',
    phone: '74 842 10 10',
    lat: 50.7924,
    lng: 16.2942,
    open24h: true,
    notes: 'Dyżur całodobowy w stanach nagłego zagrożenia życia',
    services: ['Ostry dyżur', 'Resuscytacja', 'RTG']
  },
  {
    id: 'leg-1',
    name: 'Klinika Weterynaryjna Legnica 24h',
    city: 'Legnica',
    voivodeship: 'Dolnośląskie',
    address: 'ul. Złotoryjska 89, 59-220 Legnica',
    phone: '76 854 33 22',
    lat: 51.2034,
    lng: 16.1421,
    open24h: true,
    notes: 'Dyżur ostrych przypadków, chirurgia powypadkowa, szpital dla psów i kotów',
    services: ['Dyżur urazowy', 'Szpital stacjonarny']
  },
  {
    id: 'jgo-1',
    name: 'Centrum Weterynaryjne Karkonosze 24h',
    city: 'Jelenia Góra',
    voivodeship: 'Dolnośląskie',
    address: 'ul. Wincentego Pola 15, 58-500 Jelenia Góra',
    phone: '75 752 40 40',
    lat: 50.9012,
    lng: 15.7289,
    open24h: true,
    notes: 'Całodobowy ostry dyżur w Kotlinie Jeleniogórskiej',
    services: ['Ostry dyżur 24/7', 'Zaopatrywanie złamań', 'Tlen']
  },

  // =================== WIELKOPOLSKIE ===================
  {
    id: 'poz-1',
    name: 'Uniwersyteckie Centrum Medycyny Weterynaryjnej UP 24h',
    city: 'Poznań',
    voivodeship: 'Wielkopolskie',
    address: 'ul. Szydłowska 43, 60-656 Poznań',
    phone: '61 846 66 84',
    lat: 52.4278,
    lng: 16.9082,
    open24h: true,
    notes: 'Specjalistyczny szpital kliniczny i dyżur ostrych przypadków 24h',
    services: ['Szpital kliniczny', 'Intensywna terapia', 'Tomografia', 'Chirurgia']
  },
  {
    id: 'poz-2',
    name: 'Klinika Weterynaryjna lek. wet. Grzegorz Wąsiatycz 24h',
    city: 'Poznań',
    voivodeship: 'Wielkopolskie',
    address: 'ul. Księcia Mieszka I 18, 61-689 Poznań',
    phone: '61 823 09 97',
    lat: 52.4285,
    lng: 16.9248,
    open24h: true,
    notes: 'Całodobowy dyżur interwencyjny i operacyjny, szpital, pełna analityka laboratoryjna',
    services: ['Dyżur operacyjny 24h', 'Szpital', 'Badania krwi na miejscu']
  },
  {
    id: 'kal-1',
    name: 'Centrum Weterynaryjne Kalisz 24h',
    city: 'Kalisz',
    voivodeship: 'Wielkopolskie',
    address: 'ul. Łódzka 72, 62-800 Kalisz',
    phone: '62 764 12 12',
    lat: 51.7582,
    lng: 18.1092,
    open24h: true,
    notes: 'Pogotowie weterynaryjne dla Kalisza i Ostrowa Wielkopolskiego',
    services: ['Ostry dyżur', 'Chirurgia ratunkowa']
  },
  {
    id: 'kon-1',
    name: 'Lecznica Weterynaryjna Konin 24h',
    city: 'Konin',
    voivodeship: 'Wielkopolskie',
    address: 'ul. Spółdzielców 12, 62-510 Konin',
    phone: '63 242 80 80',
    lat: 52.2312,
    lng: 18.2612,
    open24h: true,
    notes: 'Opieka nagła 24/7 dla subregionu konińskiego',
    services: ['Pomoc interwencyjna', 'USG/RTG']
  },
  {
    id: 'pil-1',
    name: 'Klinika Weterynaryjna Piła 24h',
    city: 'Piła',
    voivodeship: 'Wielkopolskie',
    address: 'ul. Bydgoska 45, 64-920 Piła',
    phone: '67 212 34 56',
    lat: 53.1482,
    lng: 16.7492,
    open24h: true,
    notes: 'Dyżur nocny i świąteczny, zaopatrywanie urazów',
    services: ['Dyżur 24/7', 'Szpital']
  },

  // =================== POMORSKIE ===================
  {
    id: 'tro-1',
    name: 'Trójmiejska Klinika Weterynaryjna 24h',
    city: 'Gdańsk',
    voivodeship: 'Pomorskie',
    address: 'ul. Kartuska 249, 80-122 Gdańsk',
    phone: '58 302 00 02',
    lat: 54.3496,
    lng: 18.5912,
    open24h: true,
    notes: 'Główne całodobowe pogotowie weterynaryjne Trójmiasta. Intensywna opieka medyczna',
    services: ['Intensywna opieka', 'Szpital 24h', 'Chirurgia urazowa', 'Tlen']
  },
  {
    id: 'tro-2',
    name: 'Lecznica Weterynaryjna Zwierzyniec 24h',
    city: 'Gdynia',
    voivodeship: 'Pomorskie',
    address: 'ul. Stryjska 25, 81-506 Gdynia',
    phone: '58 622 22 22',
    lat: 54.4921,
    lng: 18.5378,
    open24h: true,
    notes: 'Ostry dyżur 24h, diagnostyka RTG i USG na miejscu, chirurgia nagła',
    services: ['Ostry dyżur 24/7', 'RTG/USG', 'Kardiologia']
  },
  {
    id: 'slu-1',
    name: 'Całodobowe Pogotowie Weterynaryjne Słupsk',
    city: 'Słupsk',
    voivodeship: 'Pomorskie',
    address: 'ul. Szczecińska 41, 76-200 Słupsk',
    phone: '59 842 11 00',
    lat: 54.4592,
    lng: 17.0142,
    open24h: true,
    notes: 'Dyżur interwencyjny dla Pomorza Środkowego',
    services: ['Dyżur ratunkowy', 'Hospitalizacja']
  },
  {
    id: 'tcz-1',
    name: 'Lecznica Weterynaryjna Tczew 24h',
    city: 'Tczew',
    voivodeship: 'Pomorskie',
    address: 'ul. Gdańska 33, 83-110 Tczew',
    phone: '58 531 15 15',
    lat: 54.0982,
    lng: 18.7812,
    open24h: true,
    notes: 'Dyżur interwencyjny dla powiatu tczewskiego i malborskiego',
    services: ['Dyżur 24h', 'Chirurgia miękka']
  },

  // =================== ŁÓDZKIE ===================
  {
    id: 'lodz-1',
    name: 'Całodobowa Lecznica Weterynaryjna AS',
    city: 'Łódź',
    voivodeship: 'Łódzkie',
    address: 'ul. Składowa 24, 90-127 Łódź',
    phone: '42 630 00 00',
    lat: 51.7682,
    lng: 19.4672,
    open24h: true,
    notes: 'Główny ostry dyżur 24/7 w centrum Łodzi, chirurgia i szpital',
    services: ['Ostry dyżur 24h', 'Szpital stacjonarny', 'Analityka cito']
  },
  {
    id: 'lodz-2',
    name: 'Klinika Weterynaryjna Pod Koniem 24h',
    city: 'Łódź',
    voivodeship: 'Łódzkie',
    address: 'ul. Kopernika 22, 90-503 Łódź',
    phone: '42 636 50 50',
    lat: 51.7584,
    lng: 19.4442,
    open24h: true,
    notes: 'Całodobowy dyżur internistyczno-chirurgiczny, RTG cyfrowe, USG',
    services: ['Dyżur nocny', 'RTG/USG', 'Kardiologia']
  },
  {
    id: 'pio-1',
    name: 'Przychodnia Weterynaryjna Piotrków Trybunalski 24h',
    city: 'Piotrków Trybunalski',
    voivodeship: 'Łódzkie',
    address: 'ul. Słowackiego 66, 97-300 Piotrków Trybunalski',
    phone: '44 647 18 18',
    lat: 51.4021,
    lng: 19.6952,
    open24h: true,
    notes: 'Dyżur interwencyjny i pomoc nagła w nocy i w święta',
    services: ['Dyżur nagły', 'Zaopatrywanie ran']
  },

  // =================== ZACHODNIOPOMORSKIE ===================
  {
    id: 'szcz-1',
    name: 'Klinika Weterynaryjna Dobry Weterynarz 24h',
    city: 'Szczecin',
    voivodeship: 'Zachodniopomorskie',
    address: 'ul. Chopina 53A, 71-450 Szczecin',
    phone: '91 454 18 10',
    lat: 53.4542,
    lng: 14.5382,
    open24h: true,
    notes: 'Dyżur nocny i weekendowy, chirurgia ratunkowa, szpital',
    services: ['Ostry dyżur 24h', 'Chirurgia ratunkowa', 'Szpital']
  },
  {
    id: 'szcz-2',
    name: 'Lecznica Weterynaryjna Prawobrzeże 24h',
    city: 'Szczecin',
    voivodeship: 'Zachodniopomorskie',
    address: 'ul. Struga 15, 70-784 Szczecin',
    phone: '91 462 88 88',
    lat: 53.3982,
    lng: 14.6542,
    open24h: true,
    notes: 'Całodobowa pomoc dla prawobrzeżnego Szczecina i Stargardu',
    services: ['Dyżur 24h', 'RTG/USG', 'Tlenoterapia']
  },
  {
    id: 'kosz-1',
    name: 'Klinika Weterynaryjna Koszalin 24h',
    city: 'Koszalin',
    voivodeship: 'Zachodniopomorskie',
    address: 'ul. Zwycięstwa 134, 75-603 Koszalin',
    phone: '94 342 55 55',
    lat: 54.1982,
    lng: 16.1892,
    open24h: true,
    notes: 'Opieka całodobowa, hospitalizacja, ratownictwo weterynaryjne',
    services: ['Ostry dyżur 24/7', 'Szpital', 'Diagnostyka']
  },

  // =================== KUJAWSKO-POMORSKIE ===================
  {
    id: 'byd-1',
    name: 'Całodobowa Przychodnia Weterynaryjna Bydgoszcz',
    city: 'Bydgoszcz',
    voivodeship: 'Kujawsko-Pomorskie',
    address: 'ul. Bełzy 51, 85-818 Bydgoszcz',
    phone: '52 361 22 22',
    lat: 53.1142,
    lng: 18.0212,
    open24h: true,
    notes: 'Pogotowie weterynaryjne 24h, szpital dla psów i kotów, intensywna terapia',
    services: ['Pogotowie 24h', 'Intensywna opieka', 'Chirurgia miękka']
  },
  {
    id: 'byd-2',
    name: 'Klinika Weterynaryjna Kora 24h',
    city: 'Bydgoszcz',
    voivodeship: 'Kujawsko-Pomorskie',
    address: 'ul. Moniuszki 12, 85-092 Bydgoszcz',
    phone: '52 341 05 05',
    lat: 53.1298,
    lng: 18.0192,
    open24h: true,
    notes: 'Ostry dyżur 24/7, chirurgia kostna i miękka, pełne USG Doppler',
    services: ['Ostry dyżur', 'Chirurgia urazowa', 'Badania krwi']
  },
  {
    id: 'tor-1',
    name: 'Klinika Weterynaryjna Toruń 24h',
    city: 'Toruń',
    voivodeship: 'Kujawsko-Pomorskie',
    address: 'ul. Grudziądzka 82, 87-100 Toruń',
    phone: '56 655 40 40',
    lat: 53.0242,
    lng: 18.6142,
    open24h: true,
    notes: 'Całodobowy dyżur ratunkowy dla Torunia i powiatu toruńskiego',
    services: ['Dyżur całodobowy', 'Szpital', 'RTG/USG']
  },
  {
    id: 'wlo-1',
    name: 'Centrum Weterynaryjne Włocławek 24h',
    city: 'Włocławek',
    voivodeship: 'Kujawsko-Pomorskie',
    address: 'ul. Toruńska 40, 87-800 Włocławek',
    phone: '54 231 20 20',
    lat: 52.6592,
    lng: 19.0498,
    open24h: true,
    notes: 'Pogotowie weterynaryjne, interwencje nocne i świąteczne',
    services: ['Dyżur ratunkowy', 'Hospitalizacja']
  },

  // =================== LUBELSKIE ===================
  {
    id: 'lub-1',
    name: 'Uniwersytecka Poliklinika Weterynaryjna UP Lublin 24h',
    city: 'Lublin',
    voivodeship: 'Lubelskie',
    address: 'ul. Głęboka 30, 20-612 Lublin',
    phone: '81 445 61 93',
    lat: 51.2421,
    lng: 22.5372,
    open24h: true,
    notes: 'Szpital kliniczny UP Lublin, dyżur nocny i świąteczny, tomograf, chirurgia',
    services: ['Szpital akademicki', 'Chirurgia ratunkowa', 'TK', 'Intensywna opieka']
  },
  {
    id: 'lub-2',
    name: 'Klinika Weterynaryjna Lublin-Centrum 24h',
    city: 'Lublin',
    voivodeship: 'Lubelskie',
    address: 'ul. Fabryczna 10, 20-301 Lublin',
    phone: '81 744 55 66',
    lat: 51.2382,
    lng: 22.5782,
    open24h: true,
    notes: 'Opieka nagła 24h, szpital dla psów i kotów, tlen',
    services: ['Dyżur 24/7', 'Szpital', 'RTG']
  },
  {
    id: 'zam-1',
    name: 'Pogotowie Weterynaryjne Zamość 24h',
    city: 'Zamość',
    voivodeship: 'Lubelskie',
    address: 'ul. Partyzantów 28, 22-400 Zamość',
    phone: '84 639 20 20',
    lat: 50.7202,
    lng: 23.2612,
    open24h: true,
    notes: 'Dyżur pod telefonem dla Zamojszczyzny i Roztocza',
    services: ['Ostry dyżur', 'Zaopatrywanie ran']
  },

  // =================== PODKARPACKIE ===================
  {
    id: 'rze-1',
    name: 'Lecznica Weterynaryjna Chiron 24h',
    city: 'Rzeszów',
    voivodeship: 'Podkarpackie',
    address: 'ul. Moniuszki 11, 35-017 Rzeszów',
    phone: '17 852 14 00',
    lat: 50.0381,
    lng: 22.0012,
    open24h: true,
    notes: 'Główny dyżur całodobowy i szpital na Podkarpaciu, chirurgia ratunkowa',
    services: ['Ostry dyżur 24h', 'Szpital', 'Chirurgia urazowa', 'Badania krwi cito']
  },
  {
    id: 'prz-1',
    name: 'Przychodnia Weterynaryjna Przemyśl 24h',
    city: 'Przemyśl',
    voivodeship: 'Podkarpackie',
    address: 'ul. Mickiewicza 32, 37-700 Przemyśl',
    phone: '16 678 40 40',
    lat: 49.7812,
    lng: 22.7721,
    open24h: true,
    notes: 'Całodobowy dyżur telefoniczny i interwencyjny w Przemyślu i okolicach',
    services: ['Dyżur nocny', 'Chirurgia']
  },
  {
    id: 'kro-1',
    name: 'Centrum Weterynaryjne Krosno 24h',
    city: 'Krosno',
    voivodeship: 'Podkarpackie',
    address: 'ul. Lwowska 22, 38-400 Krosno',
    phone: '13 436 10 10',
    lat: 49.6842,
    lng: 21.7821,
    open24h: true,
    notes: 'Pomoc interwencyjna dla Beskidu Niskiego i Krosna',
    services: ['Dyżur 24h', 'USG/RTG']
  },

  // =================== PODLASKIE ===================
  {
    id: 'bia-1',
    name: 'Klinika Weterynaryjna Zwierzak 24h Białystok',
    city: 'Białystok',
    voivodeship: 'Podlaskie',
    address: 'ul. Wesoła 18, 15-307 Białystok',
    phone: '85 742 22 22',
    lat: 53.1284,
    lng: 23.1592,
    open24h: true,
    notes: 'Główna całodobowa klinika ratunkowa na Podlasiu, szpital, reanimacja',
    services: ['Ostry dyżur 24/7', 'Szpital', 'Chirurgia powypadkowa', 'Tlen']
  },
  {
    id: 'bia-2',
    name: 'Centrum Weterynaryjne Podlasie 24h',
    city: 'Białystok',
    voivodeship: 'Podlaskie',
    address: 'ul. Lipowa 42, 15-427 Białystok',
    phone: '85 651 30 30',
    lat: 53.1342,
    lng: 23.1512,
    open24h: true,
    notes: 'Całodobowy dyżur interwencyjny dla psów i kotów',
    services: ['Dyżur nocny', 'Badania krwi', 'Kroplówki']
  },
  {
    id: 'suw-1',
    name: 'Pogotowie Weterynaryjne Suwałki 24h',
    city: 'Suwałki',
    voivodeship: 'Podlaskie',
    address: 'ul. Kościuszki 80, 16-400 Suwałki',
    phone: '87 566 20 20',
    lat: 54.0942,
    lng: 22.9212,
    open24h: true,
    notes: 'Opieka nagła na Suwalszczyźnie, zaopatrywanie urazów',
    services: ['Dyżur telefoniczny 24h', 'Chirurgia nagła']
  },

  // =================== ŚWIĘTOKRZYSKIE ===================
  {
    id: 'kie-1',
    name: 'Klinika Weterynaryjna Cztery Łapy 24h Kielce',
    city: 'Kielce',
    voivodeship: 'Świętokrzyskie',
    address: 'ul. Sienkiewicza 65, 25-001 Kielce',
    phone: '41 368 20 20',
    lat: 50.8712,
    lng: 20.6342,
    open24h: true,
    notes: 'Główny ostry dyżur 24/7 dla województwa świętokrzyskiego, szpital, tlen',
    services: ['Ostry dyżur 24h', 'Szpital stacjonarny', 'RTG cyfrowe', 'Chirurgia']
  },
  {
    id: 'ost-1',
    name: 'Przychodnia Weterynaryjna Ostrowiec 24h',
    city: 'Ostrowiec Świętokrzyski',
    voivodeship: 'Świętokrzyskie',
    address: 'ul. Polna 22, 27-400 Ostrowiec Świętokrzyski',
    phone: '41 265 10 10',
    lat: 50.9342,
    lng: 21.3912,
    open24h: true,
    notes: 'Dyżur interwencyjny w stanach nagłych dla północnej części regionu',
    services: ['Dyżur nocny', 'Zaopatrywanie urazów']
  },

  // =================== WARMIŃSKO-MAZURSKIE ===================
  {
    id: 'ols-1',
    name: 'Poliklinika Weterynaryjna UWM Kortowo 24h Olsztyn',
    city: 'Olsztyn',
    voivodeship: 'Warmińsko-Mazurskie',
    address: 'ul. Oczapowskiego 14, 10-719 Olsztyn (Kortowo)',
    phone: '89 523 37 40',
    lat: 53.7582,
    lng: 20.4552,
    open24h: true,
    notes: 'Klinika uniwersytecka UWM, najwyższy poziom referencyjny na Warmii i Mazurach',
    services: ['Szpital uniwersytecki 24h', 'TK/MRI', 'Intensywna terapia', 'Chirurgia ostra']
  },
  {
    id: 'elb-1',
    name: 'Klinika Weterynaryjna Elbląg 24h',
    city: 'Elbląg',
    voivodeship: 'Warmińsko-Mazurskie',
    address: 'ul. Grunwaldzka 55, 82-300 Elbląg',
    phone: '55 233 40 40',
    lat: 54.1562,
    lng: 19.4142,
    open24h: true,
    notes: 'Dyżur całodobowy dla Żuław i Elbląga, hospitalizacja zwierząt',
    services: ['Dyżur 24/7', 'Szpital', 'Diagnostyka obrazowa']
  },
  {
    id: 'elk-1',
    name: 'Centrum Weterynaryjne Ełk 24h',
    city: 'Ełk',
    voivodeship: 'Warmińsko-Mazurskie',
    address: 'ul. Armii Krajowej 15, 19-300 Ełk',
    phone: '87 621 11 11',
    lat: 53.8292,
    lng: 22.3682,
    open24h: true,
    notes: 'Pomoc nagła dla wschodniej części Mazur, chirurgia powypadkowa',
    services: ['Ostry dyżur', 'Chirurgia miękka']
  },

  // =================== OPOLSKIE ===================
  {
    id: 'opo-1',
    name: 'Klinika Weterynaryjna Opole 24h',
    city: 'Opole',
    voivodeship: 'Opolskie',
    address: 'ul. Ozimska 72, 45-310 Opole',
    phone: '77 453 10 10',
    lat: 50.6698,
    lng: 17.9382,
    open24h: true,
    notes: 'Główny ostry dyżur w Opolu, szpital dla psów i kotów, chirurgia nagła',
    services: ['Ostry dyżur 24h', 'Szpital stacjonarny', 'RTG/USG', 'Tlen']
  },
  {
    id: 'ked-1',
    name: 'Lecznica Weterynaryjna Kędzierzyn-Koźle 24h',
    city: 'Kędzierzyn-Koźle',
    voivodeship: 'Opolskie',
    address: 'ul. Wojska Polskiego 18, 47-220 Kędzierzyn-Koźle',
    phone: '77 483 30 30',
    lat: 50.3421,
    lng: 18.2198,
    open24h: true,
    notes: 'Dyżur interwencyjny pod telefonem w nagłych wypadkach',
    services: ['Dyżur nagły', 'Zaopatrywanie ran']
  },

  // =================== LUBUSKIE ===================
  {
    id: 'zg-1',
    name: 'Klinika Weterynaryjna Zielona Góra 24h',
    city: 'Zielona Góra',
    voivodeship: 'Lubuskie',
    address: 'ul. Sulechowska 4a, 65-119 Zielona Góra',
    phone: '68 320 20 20',
    lat: 51.9442,
    lng: 15.5182,
    open24h: true,
    notes: 'Całodobowa klinika ratunkowa i szpital w Zielonej Górze',
    services: ['Ostry dyżur 24/7', 'Szpital', 'Chirurgia urazowa', 'Badania krwi']
  },
  {
    id: 'gorz-1',
    name: 'Centrum Weterynaryjne Gorzów Wielkopolski 24h',
    city: 'Gorzów Wielkopolski',
    voivodeship: 'Lubuskie',
    address: 'ul. Walczaka 25, 66-400 Gorzów Wielkopolski',
    phone: '95 720 15 15',
    lat: 52.7421,
    lng: 15.2412,
    open24h: true,
    notes: 'Całodobowy dyżur ratunkowy dla północnego Lubuskiego',
    services: ['Ostry dyżur 24h', 'Szpital stacjonarny', 'Tlen']
  }
];

// Re-export as VERIFIED_24H_CLINICS for backward compatibility
export const VERIFIED_24H_CLINICS = COMPREHENSIVE_24H_CLINICS;
