// 사용자 입력을 RegExp에 안전하게 넣기 위한 이스케이프 (ReDoS 및 정규식 주입 방지)
export const escapeRegex = (input: string): string =>
  input.slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
