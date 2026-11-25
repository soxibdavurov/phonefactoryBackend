# PhoneFactory Backend

휴대폰 판매 쇼핑몰 **PhoneFactory**의 백엔드 (Node.js · Express · TypeScript · MongoDB).
석사학위논문 「전자상거래 플랫폼에서의 정보보안 위협 분석 및 JavaScript 기반 대응 방안 연구」(중부대학교 정보보안학과)의 실험 대상 시스템입니다.

- 프론트엔드 (React): https://github.com/soxibdavurov/phonefactory-react

## 보안 실험 (논문 제4장)

이 `security-hardening` 브랜치에 논문의 보안 기능과 실험 코드가 있습니다.

- 환경 변수 `SECURITY=off` → 방어 미적용(baseline, 취약 상태)
- 설정하지 않음 → 방어 적용(defended)
- 실험 스크립트와 실행 방법: [`security-test/`](security-test/README.md)

실험한 공격: 권한 상승(대량 할당), 가격 변조, NoSQL 연산자 주입, 로그인 무차별 대입.

## 실행

```bash
npm install
# .env: MONGO_URL, SECRET_TOKEN, SESSION_SECRET, PORT
npm run start:dev
```
