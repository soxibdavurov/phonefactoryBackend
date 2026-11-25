// 실험용 방어 토글: SECURITY=off 이면 baseline(방어 미적용) 모드.
// 기본값(운영 환경)에서는 방어가 활성화된다.
export const SECURITY_ON = process.env.SECURITY !== "off";
