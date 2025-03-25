/*
  # Ajout de biens immobiliers en location

  1. Nouveaux biens
    - Studio moderne dans le 11ème
    - Appartement familial dans le 15ème
    - Loft design dans le 10ème
    - Appartement avec terrasse dans le 16ème

  2. Caractéristiques
    - Images d'Unsplash
    - Prix et surfaces variés
    - Différentes caractéristiques et équipements
*/

INSERT INTO properties (
  title,
  type,
  price,
  surface,
  rooms,
  location,
  description,
  images,
  features,
  furnished,
  energy_class,
  gas_emission_class,
  available_from,
  deposit_amount,
  charges,
  charges_included,
  floor_number,
  total_floors,
  property_type,
  bedrooms,
  bathrooms,
  heating,
  orientation
) VALUES
-- Studio moderne dans le 11ème
(
  'Studio moderne et lumineux - Bastille',
  'rent',
  950,
  28,
  1,
  '11ème arrondissement, Paris',
  'Magnifique studio entièrement rénové au cœur du 11ème arrondissement. Cuisine équipée moderne, salle de bain avec douche à l''italienne, nombreux rangements. Proche des commerces et des transports (métro Bastille à 5 minutes).',
  ARRAY[
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
    'https://images.unsplash.com/photo-1502005097973-6a7082348e28',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858'
  ],
  ARRAY['Cuisine équipée', 'Douche italienne', 'Rangements intégrés', 'Interphone', 'Fibre optique'],
  true,
  'B',
  'C',
  '2024-03-15',
  950,
  80,
  true,
  3,
  6,
  'studio',
  0,
  1,
  'individual',
  ARRAY['south', 'east']
),
-- Appartement familial dans le 15ème
(
  'Grand 4 pièces familial - Commerce',
  'rent',
  2800,
  85,
  4,
  '15ème arrondissement, Paris',
  'Superbe appartement familial dans un immeuble haussmannien. Double séjour lumineux, cuisine séparée et équipée, deux chambres spacieuses, bureau. Parquet, moulures, cheminées décoratives. Quartier calme et résidentiel.',
  ARRAY[
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3',
    'https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4'
  ],
  ARRAY['Double séjour', 'Parquet', 'Moulures', 'Cheminées', 'Cave', 'Cuisine équipée', 'Gardien'],
  false,
  'C',
  'D',
  '2024-04-01',
  2800,
  200,
  false,
  4,
  7,
  'apartment',
  2,
  2,
  'collective',
  ARRAY['west', 'east']
),
-- Loft design dans le 10ème
(
  'Loft contemporain - Canal Saint-Martin',
  'rent',
  1850,
  45,
  2,
  '10ème arrondissement, Paris',
  'Magnifique loft au style industriel à deux pas du Canal Saint-Martin. Espace de vie ouvert avec cuisine américaine, mezzanine aménagée en chambre, grande hauteur sous plafond. Poutres apparentes et grandes baies vitrées.',
  ARRAY[
    'https://images.unsplash.com/photo-1600607688969-a5bfcd646154',
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d',
    'https://images.unsplash.com/photo-1600607687710-41c0b5960d52'
  ],
  ARRAY['Mezzanine', 'Style industriel', 'Cuisine américaine', 'Hauteur sous plafond', 'Baies vitrées'],
  true,
  'B',
  'B',
  '2024-03-20',
  1850,
  150,
  true,
  2,
  4,
  'loft',
  1,
  1,
  'electric',
  ARRAY['north', 'south']
),
-- Appartement avec terrasse dans le 16ème
(
  'Appartement avec terrasse - Trocadéro',
  'rent',
  3500,
  75,
  3,
  '16ème arrondissement, Paris',
  'Exceptionnel appartement avec terrasse de 15m² offrant une vue dégagée. Séjour lumineux, cuisine équipée haut de gamme, deux chambres avec dressing. Prestations luxueuses, climatisation réversible. Parking en option.',
  ARRAY[
    'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea',
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea',
    'https://images.unsplash.com/photo-1600566752447-e4869355b2bb'
  ],
  ARRAY['Terrasse', 'Vue dégagée', 'Climatisation', 'Dressing', 'Cuisine équipée', 'Parking en option'],
  false,
  'A',
  'B',
  '2024-04-15',
  3500,
  300,
  false,
  6,
  8,
  'apartment',
  2,
  2,
  'individual',
  ARRAY['south', 'west']
);