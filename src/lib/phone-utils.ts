
/**
 * Нормализация номера телефона для РФ (+7XXXXXXXXXX).
 */
export function normalizePhoneNumber(phone: string): string {
  // Удаляем все нецифровые символы
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `+7${cleaned}`;
  }
  
  if (cleaned.length === 11) {
    if (cleaned.startsWith('8')) {
      return `+7${cleaned.substring(1)}`;
    }
    if (cleaned.startsWith('7')) {
      return `+${cleaned}`;
    }
  }
  
  if (cleaned.length > 11 && cleaned.startsWith('7')) {
    return `+${cleaned}`;
  }

  // Если формат совсем непонятный, возвращаем как есть (или с плюсом если его нет)
  return phone.startsWith('+') ? phone : `+${phone}`;
}
