// Fonction pour convertir une chaîne en slug SEO-friendly
export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD') // Décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Garde uniquement les lettres, chiffres, espaces et tirets
    .replace(/[\s-]+/g, '-') // Remplace les espaces et tirets multiples par un seul tiret
    .replace(/^-+|-+$/g, ''); // Supprime les tirets au début et à la fin
}
