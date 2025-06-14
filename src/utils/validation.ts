export const sanitizeTextInput = (value: string): string => {
  // Remove numbers and special characters, keep only letters, spaces, and common name characters
  return value.replace(/[^a-zA-Z\s\-'.]/g, '');
}; 
