/**
 * Formate un nom ou prénom en mettant la première lettre en majuscule et le reste en minuscules
 */
export function formatName(name: string): string {
  if (!name) return '';
  
  // Séparer les différentes parties du nom
  return name
    .toLowerCase()
    .split(/[\s-]+/) // Sépare sur les espaces et tirets
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Formate un nom complet (prénom et nom)
 */
export function formatFullName(firstName: string, lastName: string): string {
  return `${formatName(firstName)} ${formatName(lastName)}`;
}