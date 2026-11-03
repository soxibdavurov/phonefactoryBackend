// Foydalanuvchi matnini RegExp ichiga xavfsiz qo'yish uchun (ReDoS va regex injection oldini olish)
export const escapeRegex = (input: string): string =>
  input.slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
