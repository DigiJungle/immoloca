export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
  return phoneRegex.test(phone);
}

export function validatePrice(price: number): boolean {
  return price > 0 && Number.isFinite(price);
}

export function validateSurface(surface: number): boolean {
  return surface > 0 && Number.isFinite(surface);
}

export function validateRooms(rooms: number): boolean {
  return rooms > 0 && Number.isInteger(rooms);
}

export function validateSalary(salary: number): boolean {
  return salary >= 0 && Number.isFinite(salary);
}

export function validateEmploymentType(type: string): boolean {
  const validTypes = ['CDI', 'CDD', 'Intérim', 'Freelance', 'Autre'];
  return validTypes.includes(type);
}

export function validateDocuments(files: File[]): boolean {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  
  return files.every(file => 
    file.size <= maxSize && validTypes.includes(file.type)
  );
}

export function validatePropertyType(type: string): boolean {
  const validTypes = ['apartment', 'house', 'studio', 'loft', 'other'];
  return validTypes.includes(type);
}

export function validateEnergyClass(energyClass: string): boolean {
  const validClasses = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  return validClasses.includes(energyClass);
}

export function validateHeatingType(type: string): boolean {
  const validTypes = ['individual', 'collective', 'electric', 'gas', 'other'];
  return validTypes.includes(type);
}

export function validateOrientation(orientations: string[]): boolean {
  const validOrientations = ['north', 'south', 'east', 'west'];
  return orientations.every(o => validOrientations.includes(o));
}