import fs from "fs";
import path from "path";

// 보안 이벤트를 JSON 라인 형식으로 기록 (이후 분석용)
const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "security.log");

try {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
} catch (_) {
  /* 기록에 실패해도 프로그램은 중단되지 않음 */
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
  // 비밀번호, 토큰 등 민감 정보는 절대 기록하지 않음
  const line = JSON.stringify({ ts: new Date().toISOString(), event, ...details }) + "\n";
  try {
    fs.appendFile(LOG_FILE, line, () => {});
  } catch (_) {
    /* 기록 오류가 요청 처리를 중단시키지 않음 */
  }
};
