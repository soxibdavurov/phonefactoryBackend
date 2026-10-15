import fs from "fs";
import path from "path";

// Xavfsizlik hodisalari JSON satrlar ko'rinishida yoziladi (keyin tahlil uchun)
const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "security.log");

try {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
} catch (_) {
  /* yozib bo'lmasa, dastur to'xtamasin */
}

export type SecurityEvent =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAIL"
  | "RATE_LIMIT"
  | "VALIDATION_FAIL"
  | "AUTHZ_DENIED";

export const logSecurityEvent = (
  event: SecurityEvent,
  details: Record<string, unknown> = {}
): void => {
  // Parol, token kabi maxfiy maydonlar hech qachon yozilmaydi
  const line = JSON.stringify({ ts: new Date().toISOString(), event, ...details }) + "\n";
  try {
    fs.appendFile(LOG_FILE, line, () => {});
  } catch (_) {
    /* yozishdagi xatolik so'rovni to'xtatmaydi */
  }
};
