export interface SamplePetPhoto {
  id: string;
  url: string;
  species: 'dog' | 'cat' | 'rabbit' | 'ferret' | 'bird' | 'other';
  title: string;
  breedOrType: string;
}

export const SAMPLE_PET_PHOTOS: SamplePetPhoto[] = [
  // --- PSY (Dogs) ---
  {
    id: 'dog-golden',
    url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=400&q=80',
    species: 'dog',
    title: 'Golden Retriever',
    breedOrType: 'Golden Retriever / Labrador',
  },
  {
    id: 'dog-corgi',
    url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80',
    species: 'dog',
    title: 'Corgi / Piesek rudy',
    breedOrType: 'Welsh Corgi',
  },
  {
    id: 'dog-shepherd',
    url: 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?auto=format&fit=crop&w=400&q=80',
    species: 'dog',
    title: 'Owczarek niemiecki',
    breedOrType: 'Owczarek / Wilk',
  },
  {
    id: 'dog-french-bulldog',
    url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=400&q=80',
    species: 'dog',
    title: 'Buldog francuski',
    breedOrType: 'Buldog francuski / Mops',
  },
  {
    id: 'dog-husky',
    url: 'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=400&q=80',
    species: 'dog',
    title: 'Siberian Husky',
    breedOrType: 'Husky / Malamut',
  },
  {
    id: 'dog-maltese',
    url: 'https://images.unsplash.com/photo-1508948956644-0017e845d797?auto=format&fit=crop&w=400&q=80',
    species: 'dog',
    title: 'Biały maltańczyk / Bichon',
    breedOrType: 'Maltańczyk / Shih Tzu',
  },
  {
    id: 'dog-jack-russell',
    url: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=400&q=80',
    species: 'dog',
    title: 'Jack Russell / Kundelek',
    breedOrType: 'Mieszaniec / Terier',
  },
  {
    id: 'dog-bernese',
    url: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=400&q=80',
    species: 'dog',
    title: 'Pies trójkolorowy',
    breedOrType: 'Berneńczyk / Kundelek',
  },
  {
    id: 'dog-border-collie',
    url: 'https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?auto=format&fit=crop&w=400&q=80',
    species: 'dog',
    title: 'Border Collie',
    breedOrType: 'Border Collie / Pasterz',
  },

  // --- KOTY (Cats) ---
  {
    id: 'cat-ginger',
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80',
    species: 'cat',
    title: 'Rudy kotek',
    breedOrType: 'Kot europejski / Rudy',
  },
  {
    id: 'cat-british-gray',
    url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=400&q=80',
    species: 'cat',
    title: 'Kot brytyjski szary',
    breedOrType: 'Brytyjski krótkowłosy',
  },
  {
    id: 'cat-tabby',
    url: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=400&q=80',
    species: 'cat',
    title: 'Kot pręgowany / Dachowiec',
    breedOrType: 'Europejski dachowiec',
  },
  {
    id: 'cat-white-fluffy',
    url: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=400&q=80',
    species: 'cat',
    title: 'Puszysty biały kotek',
    breedOrType: 'Perski / Turecka Angora',
  },
  {
    id: 'cat-black',
    url: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=400&q=80',
    species: 'cat',
    title: 'Czarny kot z żółtymi oczami',
    breedOrType: 'Kot czarny / Bombay',
  },
  {
    id: 'cat-siamese',
    url: 'https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&w=400&q=80',
    species: 'cat',
    title: 'Kot syjamski / Ragdoll',
    breedOrType: 'Syjamski / Ragdoll',
  },

  // --- KRÓLIKI (Rabbits) ---
  {
    id: 'rabbit-lop',
    url: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=400&q=80',
    species: 'rabbit',
    title: 'Królik miniaturka',
    breedOrType: 'Królik miniaturka baranek',
  },
  {
    id: 'rabbit-white',
    url: 'https://images.unsplash.com/photo-1591382364683-b07228ec5733?auto=format&fit=crop&w=400&q=80',
    species: 'rabbit',
    title: 'Biały króliczek',
    breedOrType: 'Królik polski biały',
  },

  // --- FRETKI (Ferrets) ---
  {
    id: 'ferret-curious',
    url: 'https://images.unsplash.com/photo-1577741314755-048d8525d31e?auto=format&fit=crop&w=400&q=80',
    species: 'ferret',
    title: 'Ciekawska fretka',
    breedOrType: 'Fretka domowa',
  },

  // --- PTAKI (Birds) ---
  {
    id: 'bird-budgie',
    url: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=400&q=80',
    species: 'bird',
    title: 'Kolorowa papużka',
    breedOrType: 'Papużka falista',
  },
  {
    id: 'bird-cockatiel',
    url: 'https://images.unsplash.com/photo-1522858547137-f1dcec554f55?auto=format&fit=crop&w=400&q=80',
    species: 'bird',
    title: 'Papuga nimfa / Kanarek',
    breedOrType: 'Nimfa / Kanarek',
  },

  // --- INNE (Other) ---
  {
    id: 'other-guinea-pig',
    url: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=400&q=80',
    species: 'other',
    title: 'Świnka morska / Kawia',
    breedOrType: 'Kawia domowa',
  },
  {
    id: 'other-hamster',
    url: 'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?auto=format&fit=crop&w=400&q=80',
    species: 'other',
    title: 'Chomik syryjski',
    breedOrType: 'Gryzoń / Chomik',
  },
  {
    id: 'other-tortoise',
    url: 'https://images.unsplash.com/photo-1508455858334-95337ba25607?auto=format&fit=crop&w=400&q=80',
    species: 'other',
    title: 'Żółw lądowy',
    breedOrType: 'Gad / Żółw grecki',
  },
];

export function getDefaultPhotoForSpecies(species: 'dog' | 'cat' | 'rabbit' | 'ferret' | 'bird' | 'other'): string {
  const match = SAMPLE_PET_PHOTOS.find((p) => p.species === species);
  return match?.url || SAMPLE_PET_PHOTOS[0].url;
}
