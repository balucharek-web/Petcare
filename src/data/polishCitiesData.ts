export interface PolishCity {
  name: string;
  voivodeship: string; // Województwo
  lat: number;
  lng: number;
  isVoivodeshipCapital?: boolean;
}

// Comprehensive registry of major cities, powiat capitals and regional centers across all 16 Polish voivodeships
export const ALL_POLISH_CITIES: PolishCity[] = [
  // Mazowieckie
  { name: 'Warszawa', voivodeship: 'Mazowieckie', lat: 52.2297, lng: 21.0122, isVoivodeshipCapital: true },
  { name: 'Radom', voivodeship: 'Mazowieckie', lat: 51.4027, lng: 21.1471 },
  { name: 'Płock', voivodeship: 'Mazowieckie', lat: 52.5463, lng: 19.7065 },
  { name: 'Siedlce', voivodeship: 'Mazowieckie', lat: 52.1678, lng: 22.2901 },
  { name: 'Pruszków', voivodeship: 'Mazowieckie', lat: 52.1706, lng: 20.8122 },
  { name: 'Legionowo', voivodeship: 'Mazowieckie', lat: 52.4005, lng: 20.9328 },
  { name: 'Ostrołęka', voivodeship: 'Mazowieckie', lat: 53.0805, lng: 21.5739 },
  { name: 'Piaseczno', voivodeship: 'Mazowieckie', lat: 52.0744, lng: 21.0268 },
  { name: 'Otwock', voivodeship: 'Mazowieckie', lat: 52.1058, lng: 21.2618 },
  { name: 'Ciechanów', voivodeship: 'Mazowieckie', lat: 52.8795, lng: 20.6124 },
  { name: 'Żyrardów', voivodeship: 'Mazowieckie', lat: 52.0567, lng: 20.4444 },
  { name: 'Mińsk Mazowiecki', voivodeship: 'Mazowieckie', lat: 52.1793, lng: 21.5724 },
  { name: 'Wołomin', voivodeship: 'Mazowieckie', lat: 52.3486, lng: 21.2414 },
  { name: 'Sochaczew', voivodeship: 'Mazowieckie', lat: 52.2289, lng: 20.2372 },

  // Małopolskie
  { name: 'Kraków', voivodeship: 'Małopolskie', lat: 50.0647, lng: 19.9450, isVoivodeshipCapital: true },
  { name: 'Tarnów', voivodeship: 'Małopolskie', lat: 50.0121, lng: 20.9858 },
  { name: 'Nowy Sącz', voivodeship: 'Małopolskie', lat: 49.6249, lng: 20.6974 },
  { name: 'Oświęcim', voivodeship: 'Małopolskie', lat: 50.0344, lng: 19.2384 },
  { name: 'Chrzanów', voivodeship: 'Małopolskie', lat: 50.1386, lng: 19.4024 },
  { name: 'Olkusz', voivodeship: 'Małopolskie', lat: 50.2804, lng: 19.5639 },
  { name: 'Nowy Targ', voivodeship: 'Małopolskie', lat: 49.4778, lng: 20.0323 },
  { name: 'Bochnia', voivodeship: 'Małopolskie', lat: 49.9686, lng: 20.4304 },
  { name: 'Zakopane', voivodeship: 'Małopolskie', lat: 49.2992, lng: 19.9496 },
  { name: 'Wieliczka', voivodeship: 'Małopolskie', lat: 49.9871, lng: 20.0647 },
  { name: 'Gorlice', voivodeship: 'Małopolskie', lat: 49.6548, lng: 21.1601 },

  // Śląskie
  { name: 'Katowice', voivodeship: 'Śląskie', lat: 50.2649, lng: 19.0238, isVoivodeshipCapital: true },
  { name: 'Mikołów', voivodeship: 'Śląskie', lat: 50.1694, lng: 18.9056 },
  { name: 'Tychy', voivodeship: 'Śląskie', lat: 50.1234, lng: 18.9866 },
  { name: 'Gliwice', voivodeship: 'Śląskie', lat: 50.2945, lng: 18.6714 },
  { name: 'Zabrze', voivodeship: 'Śląskie', lat: 50.3249, lng: 18.7857 },
  { name: 'Sosnowiec', voivodeship: 'Śląskie', lat: 50.2863, lng: 19.1041 },
  { name: 'Chorzów', voivodeship: 'Śląskie', lat: 50.2975, lng: 18.9546 },
  { name: 'Ruda Śląska', voivodeship: 'Śląskie', lat: 50.2584, lng: 18.8576 },
  { name: 'Bytom', voivodeship: 'Śląskie', lat: 50.3480, lng: 18.9328 },
  { name: 'Częstochowa', voivodeship: 'Śląskie', lat: 50.8118, lng: 19.1203 },
  { name: 'Bielsko-Biała', voivodeship: 'Śląskie', lat: 49.8224, lng: 19.0444 },
  { name: 'Rybnik', voivodeship: 'Śląskie', lat: 50.1022, lng: 18.5463 },
  { name: 'Łaziska Górne', voivodeship: 'Śląskie', lat: 50.1517, lng: 18.8436 },
  { name: 'Orzesze', voivodeship: 'Śląskie', lat: 50.1436, lng: 18.7758 },
  { name: 'Pszczyna', voivodeship: 'Śląskie', lat: 49.9789, lng: 18.9431 },
  { name: 'Bieruń', voivodeship: 'Śląskie', lat: 50.0886, lng: 19.0911 },
  { name: 'Lędziny', voivodeship: 'Śląskie', lat: 50.1444, lng: 19.1172 },
  { name: 'Knurów', voivodeship: 'Śląskie', lat: 50.2208, lng: 18.6756 },
  { name: 'Czerwionka-Leszczyny', voivodeship: 'Śląskie', lat: 50.1514, lng: 18.6728 },
  { name: 'Świętochłowice', voivodeship: 'Śląskie', lat: 50.2917, lng: 18.9183 },
  { name: 'Siemianowice Śląskie', voivodeship: 'Śląskie', lat: 50.3019, lng: 19.0305 },
  { name: 'Dąbrowa Górnicza', voivodeship: 'Śląskie', lat: 50.3217, lng: 19.1867 },
  { name: 'Jaworzno', voivodeship: 'Śląskie', lat: 50.2052, lng: 19.2747 },
  { name: 'Mysłowice', voivodeship: 'Śląskie', lat: 50.2412, lng: 19.1417 },
  { name: 'Jastrzębie-Zdrój', voivodeship: 'Śląskie', lat: 49.9537, lng: 18.5772 },
  { name: 'Żory', voivodeship: 'Śląskie', lat: 50.0469, lng: 18.6923 },
  { name: 'Tarnowskie Góry', voivodeship: 'Śląskie', lat: 50.4485, lng: 18.8587 },
  { name: 'Będzin', voivodeship: 'Śląskie', lat: 50.3259, lng: 19.1297 },
  { name: 'Piekary Śląskie', voivodeship: 'Śląskie', lat: 50.3705, lng: 18.9482 },
  { name: 'Cieszyn', voivodeship: 'Śląskie', lat: 49.7494, lng: 18.6328 },
  { name: 'Żywiec', voivodeship: 'Śląskie', lat: 49.6894, lng: 19.1989 },
  { name: 'Ustroń', voivodeship: 'Śląskie', lat: 49.7214, lng: 18.8058 },
  { name: 'Wisła', voivodeship: 'Śląskie', lat: 49.6561, lng: 18.8592 },
  { name: 'Racibórz', voivodeship: 'Śląskie', lat: 50.0919, lng: 18.2194 },
  { name: 'Zawiercie', voivodeship: 'Śląskie', lat: 50.4877, lng: 19.4168 },
  { name: 'Wodzisław Śląski', voivodeship: 'Śląskie', lat: 50.0028, lng: 18.4632 },
  { name: 'Rydułtowy', voivodeship: 'Śląskie', lat: 50.0583, lng: 18.4194 },
  { name: 'Radlin', voivodeship: 'Śląskie', lat: 50.0333, lng: 18.4722 },
  { name: 'Lubliniec', voivodeship: 'Śląskie', lat: 50.6694, lng: 18.6806 },
  { name: 'Myszków', voivodeship: 'Śląskie', lat: 50.5758, lng: 19.3242 },
  { name: 'Kłobuck', voivodeship: 'Śląskie', lat: 50.9022, lng: 18.9367 },
  { name: 'Wyry', voivodeship: 'Śląskie', lat: 50.1347, lng: 18.9039 },
  { name: 'Gostyń', voivodeship: 'Śląskie', lat: 50.1114, lng: 18.8953 },
  { name: 'Ornontowice', voivodeship: 'Śląskie', lat: 50.1772, lng: 18.7514 },
  { name: 'Kobiór', voivodeship: 'Śląskie', lat: 50.0658, lng: 18.9358 },
  { name: 'Suszec', voivodeship: 'Śląskie', lat: 50.0411, lng: 18.7906 },
  { name: 'Bojszowy', voivodeship: 'Śląskie', lat: 50.0764, lng: 19.0983 },
  { name: 'Chełm Śląski', voivodeship: 'Śląskie', lat: 50.1133, lng: 19.2064 },
  { name: 'Imielin', voivodeship: 'Śląskie', lat: 50.1417, lng: 19.1861 },
  { name: 'Goczałkowice-Zdrój', voivodeship: 'Śląskie', lat: 49.9406, lng: 18.9669 },
  { name: 'Pawłowice', voivodeship: 'Śląskie', lat: 49.9614, lng: 18.7183 },
  { name: 'Gierałtowice', voivodeship: 'Śląskie', lat: 50.2197, lng: 18.7231 },

  // Dolnośląskie
  { name: 'Wrocław', voivodeship: 'Dolnośląskie', lat: 51.1079, lng: 17.0385, isVoivodeshipCapital: true },
  { name: 'Wałbrzych', voivodeship: 'Dolnośląskie', lat: 50.7714, lng: 16.2842 },
  { name: 'Legnica', voivodeship: 'Dolnośląskie', lat: 51.2070, lng: 16.1553 },
  { name: 'Jelenia Góra', voivodeship: 'Dolnośląskie', lat: 50.9044, lng: 15.7194 },
  { name: 'Lubin', voivodeship: 'Dolnośląskie', lat: 51.3985, lng: 16.2014 },
  { name: 'Głogów', voivodeship: 'Dolnośląskie', lat: 51.6635, lng: 16.0847 },
  { name: 'Świdnica', voivodeship: 'Dolnośląskie', lat: 50.8438, lng: 16.4886 },
  { name: 'Bolesławiec', voivodeship: 'Dolnośląskie', lat: 51.2638, lng: 15.5674 },
  { name: 'Oleśnica', voivodeship: 'Dolnośląskie', lat: 51.2104, lng: 17.3797 },
  { name: 'Dzierżoniów', voivodeship: 'Dolnośląskie', lat: 50.7282, lng: 16.6508 },
  { name: 'Oława', voivodeship: 'Dolnośląskie', lat: 50.9431, lng: 17.2942 },
  { name: 'Kłodzko', voivodeship: 'Dolnośląskie', lat: 50.4382, lng: 16.6547 },

  // Wielkopolskie
  { name: 'Poznań', voivodeship: 'Wielkopolskie', lat: 52.4064, lng: 16.9252, isVoivodeshipCapital: true },
  { name: 'Kalisz', voivodeship: 'Wielkopolskie', lat: 51.7611, lng: 18.0910 },
  { name: 'Konin', voivodeship: 'Wielkopolskie', lat: 52.2234, lng: 18.2512 },
  { name: 'Piła', voivodeship: 'Wielkopolskie', lat: 53.1513, lng: 16.7380 },
  { name: 'Ostrów Wielkopolski', voivodeship: 'Wielkopolskie', lat: 51.6550, lng: 17.8068 },
  { name: 'Gniezno', voivodeship: 'Wielkopolskie', lat: 52.5348, lng: 17.5826 },
  { name: 'Leszno', voivodeship: 'Wielkopolskie', lat: 51.8403, lng: 16.5749 },
  { name: 'Swarzędz', voivodeship: 'Wielkopolskie', lat: 52.4128, lng: 17.0792 },
  { name: 'Śrem', voivodeship: 'Wielkopolskie', lat: 52.0886, lng: 17.0152 },
  { name: 'Krotoszyn', voivodeship: 'Wielkopolskie', lat: 51.6978, lng: 17.4367 },
  { name: 'Września', voivodeship: 'Wielkopolskie', lat: 52.3251, lng: 17.5653 },
  { name: 'Turek', voivodeship: 'Wielkopolskie', lat: 52.0163, lng: 18.5009 },

  // Pomorskie
  { name: 'Gdańsk', voivodeship: 'Pomorskie', lat: 54.3520, lng: 18.6466, isVoivodeshipCapital: true },
  { name: 'Gdynia', voivodeship: 'Pomorskie', lat: 54.5189, lng: 18.5305 },
  { name: 'Słupsk', voivodeship: 'Pomorskie', lat: 54.4641, lng: 17.0287 },
  { name: 'Tczew', voivodeship: 'Pomorskie', lat: 54.0924, lng: 18.7884 },
  { name: 'Wejherowo', voivodeship: 'Pomorskie', lat: 54.6063, lng: 18.2343 },
  { name: 'Rumia', voivodeship: 'Pomorskie', lat: 54.5908, lng: 18.3976 },
  { name: 'Starogard Gdański', voivodeship: 'Pomorskie', lat: 53.9634, lng: 18.5284 },
  { name: 'Chojnice', voivodeship: 'Pomorskie', lat: 53.6954, lng: 17.5574 },
  { name: 'Malbork', voivodeship: 'Pomorskie', lat: 54.0359, lng: 19.0266 },
  { name: 'Kwidzyn', voivodeship: 'Pomorskie', lat: 53.7247, lng: 18.9318 },
  { name: 'Sopot', voivodeship: 'Pomorskie', lat: 54.4418, lng: 18.5600 },
  { name: 'Lębork', voivodeship: 'Pomorskie', lat: 54.5392, lng: 17.7493 },

  // Łódzkie
  { name: 'Łódź', voivodeship: 'Łódzkie', lat: 51.7592, lng: 19.4560, isVoivodeshipCapital: true },
  { name: 'Piotrków Trybunalski', voivodeship: 'Łódzkie', lat: 51.4052, lng: 19.7030 },
  { name: 'Pabianice', voivodeship: 'Łódzkie', lat: 51.6645, lng: 19.3556 },
  { name: 'Tomaszów Mazowiecki', voivodeship: 'Łódzkie', lat: 51.5311, lng: 20.0083 },
  { name: 'Bełchatów', voivodeship: 'Łódzkie', lat: 51.3688, lng: 19.3698 },
  { name: 'Zgierz', voivodeship: 'Łódzkie', lat: 51.8569, lng: 19.4061 },
  { name: 'Skierniewice', voivodeship: 'Łódzkie', lat: 51.9547, lng: 20.1444 },
  { name: 'Radomsko', voivodeship: 'Łódzkie', lat: 51.0664, lng: 19.4447 },
  { name: 'Kutno', voivodeship: 'Łódzkie', lat: 52.2326, lng: 19.3644 },
  { name: 'Sieradz', voivodeship: 'Łódzkie', lat: 51.5960, lng: 18.7303 },
  { name: 'Zduńska Wola', voivodeship: 'Łódzkie', lat: 51.6006, lng: 18.9392 },

  // Zachodniopomorskie
  { name: 'Szczecin', voivodeship: 'Zachodniopomorskie', lat: 53.4285, lng: 14.5528, isVoivodeshipCapital: true },
  { name: 'Koszalin', voivodeship: 'Zachodniopomorskie', lat: 54.1944, lng: 16.1722 },
  { name: 'Stargard', voivodeship: 'Zachodniopomorskie', lat: 53.3386, lng: 15.0450 },
  { name: 'Kołobrzeg', voivodeship: 'Zachodniopomorskie', lat: 54.1759, lng: 15.5833 },
  { name: 'Świnoujście', voivodeship: 'Zachodniopomorskie', lat: 53.9100, lng: 14.2471 },
  { name: 'Szczecinek', voivodeship: 'Zachodniopomorskie', lat: 53.7077, lng: 16.6990 },
  { name: 'Police', voivodeship: 'Zachodniopomorskie', lat: 53.5521, lng: 14.5714 },
  { name: 'Wałcz', voivodeship: 'Zachodniopomorskie', lat: 53.2781, lng: 16.4714 },

  // Kujawsko-Pomorskie
  { name: 'Bydgoszcz', voivodeship: 'Kujawsko-Pomorskie', lat: 53.1235, lng: 18.0084, isVoivodeshipCapital: true },
  { name: 'Toruń', voivodeship: 'Kujawsko-Pomorskie', lat: 53.0138, lng: 18.5984, isVoivodeshipCapital: true },
  { name: 'Włocławek', voivodeship: 'Kujawsko-Pomorskie', lat: 52.6484, lng: 19.0678 },
  { name: 'Grudziądz', voivodeship: 'Kujawsko-Pomorskie', lat: 53.4841, lng: 18.7537 },
  { name: 'Inowrocław', voivodeship: 'Kujawsko-Pomorskie', lat: 52.7989, lng: 18.2639 },
  { name: 'Brodnica', voivodeship: 'Kujawsko-Pomorskie', lat: 53.2592, lng: 19.3958 },
  { name: 'Świecie', voivodeship: 'Kujawsko-Pomorskie', lat: 53.4093, lng: 18.4475 },
  { name: 'Chełmno', voivodeship: 'Kujawsko-Pomorskie', lat: 53.3496, lng: 18.4253 },

  // Lubelskie
  { name: 'Lublin', voivodeship: 'Lubelskie', lat: 51.2465, lng: 22.5684, isVoivodeshipCapital: true },
  { name: 'Zamość', voivodeship: 'Lubelskie', lat: 50.7231, lng: 23.2520 },
  { name: 'Chełm', voivodeship: 'Lubelskie', lat: 51.1444, lng: 23.4714 },
  { name: 'Biała Podlaska', voivodeship: 'Lubelskie', lat: 52.0324, lng: 23.1165 },
  { name: 'Puławy', voivodeship: 'Lubelskie', lat: 51.4166, lng: 21.9694 },
  { name: 'Świdnik', voivodeship: 'Lubelskie', lat: 51.2189, lng: 22.6947 },
  { name: 'Kraśnik', voivodeship: 'Lubelskie', lat: 50.9234, lng: 22.2268 },
  { name: 'Łuków', voivodeship: 'Lubelskie', lat: 51.9286, lng: 22.3831 },
  { name: 'Biłgoraj', voivodeship: 'Lubelskie', lat: 50.5407, lng: 22.7214 },

  // Podkarpackie
  { name: 'Rzeszów', voivodeship: 'Podkarpackie', lat: 50.0412, lng: 21.9991, isVoivodeshipCapital: true },
  { name: 'Przemyśl', voivodeship: 'Podkarpackie', lat: 49.7839, lng: 22.7679 },
  { name: 'Stalowa Wola', voivodeship: 'Podkarpackie', lat: 50.5828, lng: 22.0534 },
  { name: 'Mielec', voivodeship: 'Podkarpackie', lat: 50.2872, lng: 21.4247 },
  { name: 'Krosno', voivodeship: 'Podkarpackie', lat: 49.6887, lng: 21.7706 },
  { name: 'Tarnobrzeg', voivodeship: 'Podkarpackie', lat: 50.5744, lng: 21.6789 },
  { name: 'Dębica', voivodeship: 'Podkarpackie', lat: 50.0515, lng: 21.4114 },
  { name: 'Jarosław', voivodeship: 'Podkarpackie', lat: 50.0163, lng: 22.6842 },
  { name: 'Sanok', voivodeship: 'Podkarpackie', lat: 49.5606, lng: 22.2064 },
  { name: 'Jasło', voivodeship: 'Podkarpackie', lat: 49.7451, lng: 21.4725 },

  // Podlaskie
  { name: 'Białystok', voivodeship: 'Podlaskie', lat: 53.1325, lng: 23.1688, isVoivodeshipCapital: true },
  { name: 'Suwałki', voivodeship: 'Podlaskie', lat: 54.0991, lng: 22.9298 },
  { name: 'Łomża', voivodeship: 'Podlaskie', lat: 53.1781, lng: 22.0594 },
  { name: 'Augustów', voivodeship: 'Podlaskie', lat: 53.8433, lng: 22.9797 },
  { name: 'Bielsk Podlaski', voivodeship: 'Podlaskie', lat: 52.7651, lng: 23.1904 },
  { name: 'Zambrów', voivodeship: 'Podlaskie', lat: 52.9856, lng: 22.2427 },
  { name: 'Hajnówka', voivodeship: 'Podlaskie', lat: 52.7433, lng: 23.5817 },

  // Świętokrzyskie
  { name: 'Kielce', voivodeship: 'Świętokrzyskie', lat: 50.8661, lng: 20.6286, isVoivodeshipCapital: true },
  { name: 'Ostrowiec Świętokrzyski', voivodeship: 'Świętokrzyskie', lat: 50.9294, lng: 21.3853 },
  { name: 'Starachowice', voivodeship: 'Świętokrzyskie', lat: 51.0526, lng: 21.0694 },
  { name: 'Skarżysko-Kamienna', voivodeship: 'Świętokrzyskie', lat: 51.1147, lng: 20.8719 },
  { name: 'Sandomierz', voivodeship: 'Świętokrzyskie', lat: 50.6828, lng: 21.7489 },
  { name: 'Końskie', voivodeship: 'Świętokrzyskie', lat: 51.1936, lng: 20.4072 },
  { name: 'Busko-Zdrój', voivodeship: 'Świętokrzyskie', lat: 50.4707, lng: 20.7188 },

  // Warmińsko-Mazurskie
  { name: 'Olsztyn', voivodeship: 'Warmińsko-Mazurskie', lat: 53.7784, lng: 20.4801, isVoivodeshipCapital: true },
  { name: 'Elbląg', voivodeship: 'Warmińsko-Mazurskie', lat: 54.1522, lng: 19.4088 },
  { name: 'Ełk', voivodeship: 'Warmińsko-Mazurskie', lat: 53.8277, lng: 22.3619 },
  { name: 'Ostróda', voivodeship: 'Warmińsko-Mazurskie', lat: 53.6961, lng: 19.9650 },
  { name: 'Iława', voivodeship: 'Warmińsko-Mazurskie', lat: 53.5960, lng: 19.5654 },
  { name: 'Giżycko', voivodeship: 'Warmińsko-Mazurskie', lat: 54.0381, lng: 21.7647 },
  { name: 'Kętrzyn', voivodeship: 'Warmińsko-Mazurskie', lat: 54.0766, lng: 21.3756 },
  { name: 'Szczytno', voivodeship: 'Warmińsko-Mazurskie', lat: 53.5631, lng: 20.9856 },
  { name: 'Mrągowo', voivodeship: 'Warmińsko-Mazurskie', lat: 53.8644, lng: 21.3050 },

  // Opolskie
  { name: 'Opole', voivodeship: 'Opolskie', lat: 50.6751, lng: 17.9213, isVoivodeshipCapital: true },
  { name: 'Kędzierzyn-Koźle', voivodeship: 'Opolskie', lat: 50.3475, lng: 18.2128 },
  { name: 'Nysa', voivodeship: 'Opolskie', lat: 50.4738, lng: 17.3344 },
  { name: 'Brzeg', voivodeship: 'Opolskie', lat: 50.8608, lng: 17.4674 },
  { name: 'Kluczbork', voivodeship: 'Opolskie', lat: 50.9728, lng: 18.2153 },
  { name: 'Prudnik', voivodeship: 'Opolskie', lat: 50.3214, lng: 17.5819 },
  { name: 'Strzelce Opolskie', voivodeship: 'Opolskie', lat: 50.5117, lng: 18.3006 },

  // Lubuskie
  { name: 'Zielona Góra', voivodeship: 'Lubuskie', lat: 51.9356, lng: 15.5062, isVoivodeshipCapital: true },
  { name: 'Gorzów Wielkopolski', voivodeship: 'Lubuskie', lat: 52.7368, lng: 15.2288, isVoivodeshipCapital: true },
  { name: 'Nowa Sól', voivodeship: 'Lubuskie', lat: 51.8028, lng: 15.7153 },
  { name: 'Żary', voivodeship: 'Lubuskie', lat: 51.6425, lng: 15.1378 },
  { name: 'Żagań', voivodeship: 'Lubuskie', lat: 51.6169, lng: 15.3247 },
  { name: 'Świebodzin', voivodeship: 'Lubuskie', lat: 52.2478, lng: 15.5342 },
  { name: 'Kostrzyn nad Odrą', voivodeship: 'Lubuskie', lat: 52.5975, lng: 14.6547 },
  { name: 'Słubice', voivodeship: 'Lubuskie', lat: 52.3519, lng: 14.5614 }
];

// Helper: Calculate distance between two lat/lng points in km
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Find nearest known city from given lat/lng
export function getNearestPolishCity(lat: number, lng: number): { city: PolishCity; distanceKm: number } {
  let nearest = ALL_POLISH_CITIES[0];
  let minDistance = calculateDistanceKm(lat, lng, nearest.lat, nearest.lng);

  for (let i = 1; i < ALL_POLISH_CITIES.length; i++) {
    const dist = calculateDistanceKm(lat, lng, ALL_POLISH_CITIES[i].lat, ALL_POLISH_CITIES[i].lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = ALL_POLISH_CITIES[i];
    }
  }

  return { city: nearest, distanceKm: minDistance };
}

// Get all unique voivodeships
export const ALL_VOIVODESHIPS = Array.from(new Set(ALL_POLISH_CITIES.map(c => c.voivodeship))).sort();

// Normalize text by removing Polish diacritics for ultra-fast, tolerant fuzzy search
export function normalizePolishText(text: string): string {
  return text
    .toLowerCase()
    .replace(/ą/g, 'a')
    .replace(/ć/g, 'c')
    .replace(/ę/g, 'e')
    .replace(/ł/g, 'l')
    .replace(/ń/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/ś/g, 's')
    .replace(/ź/g, 'z')
    .replace(/ż/g, 'z')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Get nearby Polish cities sorted by distance from coordinates
export function getNearbyCities(
  lat: number, 
  lng: number, 
  limit: number = 6, 
  maxDistanceKm: number = 65
): Array<{ city: PolishCity; distanceKm: number }> {
  return ALL_POLISH_CITIES
    .map(c => ({
      city: c,
      distanceKm: calculateDistanceKm(lat, lng, c.lat, c.lng)
    }))
    .filter(item => item.distanceKm <= maxDistanceKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

